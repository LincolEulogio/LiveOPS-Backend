import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { createHash } from 'crypto';
import type { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { AiService } from '@/ai/ai.service';
import type { ProductionHealthStats } from '@/streaming/streaming.types';
import type {
  AlertThreshold,
  ComparisonResult,
  DashboardMetrics,
  RetentionConfig,
  TelemetryStats,
} from '@/analytics/analytics.types';

const METRICS_CACHE_TTL = 10_000;  // 10s — live dashboard freshness
const AI_ANALYSIS_CACHE_TTL = 3_600; // 1h — AI results are expensive and stable

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  private lastWriteTime = new Map<string, number>();
  private readonly WRITE_INTERVAL_MS = 5_000;

  private alertThresholds = new Map<string, AlertThreshold[]>();
  private retentionConfigs = new Map<string, RetentionConfig>();

  /** Tracks in-flight report generation jobs to prevent duplicate runs. */
  private reportJobs = new Map<string, 'pending' | 'done' | 'error'>();

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ─── Telemetry ingest ───────────────────────────────────────────────────────

  @OnEvent('production.health.stats')
  async handleProductionHealthStats(payload: ProductionHealthStats) {
    try {
      const { productionId } = payload;
      if (!productionId) return;

      const now = Date.now();
      const lastWrite = this.lastWriteTime.get(productionId) ?? 0;
      if (now - lastWrite < this.WRITE_INTERVAL_MS) return;

      this.lastWriteTime.set(productionId, now);

      await this.prisma.telemetryLog.create({
        data: {
          productionId,
          cpuUsage: payload.cpuUsage,
          memoryUsage: payload.memoryUsage,
          fps: payload.fps,
          bitrate: payload.bitrate || 0,
          droppedFrames: payload.skippedFrames || 0,
          isStreaming: payload.isStreaming,
          isRecording: payload.isRecording,
        },
      });

      // Invalidate cached metrics so the next poll reflects new data
      await this.cacheManager.del(`dashboard_metrics_${productionId}`);

      this.checkThresholds(productionId, payload);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to save telemetry for production ${payload.productionId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private checkThresholds(productionId: string, payload: ProductionHealthStats): void {
    const thresholds = this.alertThresholds.get(productionId);
    if (!thresholds?.length) return;

    const values: Record<AlertThreshold['metric'], number> = {
      cpuUsage: payload.cpuUsage,
      memoryUsage: payload.memoryUsage,
      fps: payload.fps,
      bitrate: payload.bitrate ?? 0,
      droppedFrames: payload.skippedFrames ?? 0,
    };

    for (const threshold of thresholds) {
      const current = values[threshold.metric];
      const breached =
        threshold.operator === 'gt' ? current > threshold.value : current < threshold.value;

      if (breached) {
        this.logger.warn(
          `Alert [${productionId}] ${threshold.label}: ${threshold.metric} ${threshold.operator} ${threshold.value} (current: ${current})`,
        );
      }
    }
  }

  // ─── Telemetry read ─────────────────────────────────────────────────────────

  async getTelemetryLogs(productionId: string, minutes = 60) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.prisma.telemetryLog.findMany({
      where: { productionId, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
    });
  }

  // ─── Show report ────────────────────────────────────────────────────────────

  /**
   * Queues report generation asynchronously.
   * Returns immediately so the HTTP request doesn't block while processing
   * potentially thousands of telemetry rows + an AI call.
   */
  async enqueueShowReport(productionId: string): Promise<{ status: string; message: string }> {
    const existing = await this.prisma.showReport.findUnique({ where: { productionId } });
    if (existing) return { status: 'done', message: 'Report already generated. Fetch it with GET /report.' };

    const jobStatus = this.reportJobs.get(productionId);
    if (jobStatus === 'pending') {
      return { status: 'pending', message: 'Report generation already in progress.' };
    }

    this.reportJobs.set(productionId, 'pending');
    // Fire-and-forget event — the heavy work happens in the listener below
    this.eventEmitter.emit('analytics.report.generate', { productionId });

    return { status: 'queued', message: 'Report generation started. Poll GET /report for the result.' };
  }

  /** Returns the report if ready, or the current job status if still generating. */
  async getShowReport(productionId: string) {
    const report = await this.prisma.showReport.findUnique({ where: { productionId } });
    if (report) return { status: 'done', report };

    const jobStatus = this.reportJobs.get(productionId);
    if (jobStatus) return { status: jobStatus, report: null };

    return { status: 'not_started', report: null };
  }

  @OnEvent('analytics.report.generate')
  async handleReportGeneration({ productionId }: { productionId: string }): Promise<void> {
    try {
      const [telemetry, timelineBlocks] = await Promise.all([
        this.prisma.telemetryLog.findMany({
          where: { productionId },
          orderBy: { timestamp: 'asc' },
          // Use aggregate-friendly select to avoid fetching unused columns
          select: { timestamp: true, cpuUsage: true, fps: true, droppedFrames: true, isStreaming: true },
        }),
        this.prisma.timelineBlock.findMany({
          where: { productionId },
          orderBy: { order: 'asc' },
          select: { startTime: true, endTime: true },
        }),
      ]);

      const streamingLogs = telemetry.filter((t) => t.isStreaming);
      let startTime: Date | undefined = streamingLogs[0]?.timestamp;
      let endTime: Date | undefined = streamingLogs[streamingLogs.length - 1]?.timestamp;
      let durationMs = 0;

      if (startTime && endTime) {
        durationMs = endTime.getTime() - startTime.getTime();
      } else {
        const firstBlock = timelineBlocks.find((b) => b.startTime);
        const lastBlock = [...timelineBlocks].reverse().find((b) => b.endTime);
        if (firstBlock?.startTime && lastBlock?.endTime) {
          startTime = firstBlock.startTime;
          endTime = lastBlock.endTime;
          durationMs = endTime.getTime() - startTime.getTime();
        }
      }

      const totalDroppedFrames = telemetry.reduce((sum, l) => sum + (l.droppedFrames ?? 0), 0);
      const maxCpu = Math.max(...telemetry.map((t) => t.cpuUsage ?? 0), 0);
      const avgFps = telemetry.length
        ? telemetry.reduce((sum, l) => sum + (l.fps ?? 0), 0) / telemetry.length
        : 0;

      const statsInput = { durationMs, avgFps, maxCpu, totalDroppedFrames, samples: telemetry.length };

      // Cache AI analysis by content hash — same stats = same analysis, no repeat API calls
      const statsHash = createHash('sha256').update(JSON.stringify(statsInput)).digest('hex').slice(0, 16);
      const aiCacheKey = `ai_show_analysis_${statsHash}`;
      let aiAnalysis = await this.cacheManager.get<string>(aiCacheKey);

      if (!aiAnalysis) {
        aiAnalysis = await this.aiService.analyzeShowPerformance(statsInput);
        await this.cacheManager.set(aiCacheKey, aiAnalysis, AI_ANALYSIS_CACHE_TTL);
      }

      await this.prisma.showReport.create({
        data: {
          productionId,
          startTime,
          endTime,
          durationMs,
          alertsCount: 0,
          peakViewers: 0,
          metrics: { ...statsInput },
          aiAnalysis,
        },
      });

      this.reportJobs.set(productionId, 'done');
      this.logger.log(`Show report generated for production ${productionId} (${telemetry.length} samples)`);
    } catch (error: unknown) {
      this.reportJobs.set(productionId, 'error');
      this.logger.error(
        `Report generation failed for ${productionId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // ─── SEO ────────────────────────────────────────────────────────────────────

  async getPostShowSeo(productionId: string) {
    const [reportResult, production] = await Promise.all([
      this.getShowReport(productionId),
      this.prisma.production.findUnique({
        where: { id: productionId },
        include: { script: true, timelineBlocks: true },
      }),
    ]);

    if (!reportResult.report) throw new Error('No report found. Generate it first.');

    const seoInput = {
      name: production?.name ?? 'Show en Vivo',
      duration: `${Math.round((reportResult.report.durationMs ?? 0) / 60000)} min`,
      topics: production?.timelineBlocks.map((b) => b.title).join(', ') ?? 'Varios',
    };

    // Cache by content hash — same show = same SEO package, no repeat AI calls
    const seoHash = createHash('sha256').update(JSON.stringify(seoInput)).digest('hex').slice(0, 16);
    const cacheKey = `ai_seo_${seoHash}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await this.aiService.generatePostShowSEO(seoInput);
    await this.cacheManager.set(cacheKey, result, AI_ANALYSIS_CACHE_TTL);
    return result;
  }

  // ─── Dashboard metrics (cached) ─────────────────────────────────────────────

  async getDashboardMetrics(productionId: string): Promise<DashboardMetrics> {
    const cacheKey = `dashboard_metrics_${productionId}`;
    const cached = await this.cacheManager.get<DashboardMetrics>(cacheKey);
    if (cached) return cached;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [recentTelemetry, recentLogs] = await Promise.all([
      this.prisma.telemetryLog.findMany({
        where: { productionId, timestamp: { gte: oneHourAgo } },
        orderBy: { timestamp: 'desc' },
        take: 20,
      }),
      this.prisma.productionLog.findMany({
        where: { productionId, createdAt: { gte: oneHourAgo } },
      }),
    ]);

    const avgDropped = recentTelemetry.length
      ? recentTelemetry.reduce((s, t) => s + (t.droppedFrames ?? 0), 0) / recentTelemetry.length
      : 0;

    const systemIntegrity: DashboardMetrics['systemIntegrity'] =
      avgDropped > 10 ? 'CRITICAL' : avgDropped > 2 ? 'DEGRADED' : 'OPTIMAL';

    const uniqueUsers = new Set(recentLogs.map((l) => l.userId).filter(Boolean)).size;

    const securityAlertsCount = recentLogs.filter(
      (l) => l.eventType.includes('AUTH') || l.eventType.includes('FAILURE'),
    ).length;

    const metrics: DashboardMetrics = {
      systemIntegrity,
      humanActivityCount: uniqueUsers || 1,
      securityAlertsCount,
      lastSyncAt: new Date().toISOString(),
    };

    await this.cacheManager.set(cacheKey, metrics, METRICS_CACHE_TTL);
    return metrics;
  }

  // ─── Production comparison ───────────────────────────────────────────────────

  async compareProductions(
    idA: string,
    idB: string,
    minutes: number,
  ): Promise<ComparisonResult> {
    const [statsA, statsB] = await Promise.all([
      this.computeStats(idA, minutes),
      this.computeStats(idB, minutes),
    ]);

    return {
      productionA: { id: idA, stats: statsA },
      productionB: { id: idB, stats: statsB },
      periodMinutes: minutes,
    };
  }

  private async computeStats(productionId: string, minutes: number): Promise<TelemetryStats> {
    const logs = await this.getTelemetryLogs(productionId, minutes);

    if (!logs.length) {
      return {
        avgCpu: 0,
        avgMemory: 0,
        avgFps: 0,
        avgBitrate: 0,
        totalDroppedFrames: 0,
        peakCpu: 0,
        peakMemory: 0,
        samples: 0,
      };
    }

    const n = logs.length;
    return {
      avgCpu: logs.reduce((s, l) => s + (l.cpuUsage ?? 0), 0) / n,
      avgMemory: logs.reduce((s, l) => s + (l.memoryUsage ?? 0), 0) / n,
      avgFps: logs.reduce((s, l) => s + (l.fps ?? 0), 0) / n,
      avgBitrate: logs.reduce((s, l) => s + (l.bitrate ?? 0), 0) / n,
      totalDroppedFrames: logs.reduce((s, l) => s + (l.droppedFrames ?? 0), 0),
      peakCpu: Math.max(...logs.map((l) => l.cpuUsage ?? 0)),
      peakMemory: Math.max(...logs.map((l) => l.memoryUsage ?? 0)),
      samples: n,
    };
  }

  // ─── Threshold alerts ────────────────────────────────────────────────────────

  getAlertThresholds(productionId: string): AlertThreshold[] {
    return this.alertThresholds.get(productionId) ?? [];
  }

  setAlertThreshold(productionId: string, threshold: AlertThreshold): AlertThreshold[] {
    const existing = this.alertThresholds.get(productionId) ?? [];
    const idx = existing.findIndex((t) => t.metric === threshold.metric);
    if (idx >= 0) {
      existing[idx] = threshold;
    } else {
      existing.push(threshold);
    }
    this.alertThresholds.set(productionId, existing);
    return existing;
  }

  removeAlertThreshold(
    productionId: string,
    metric: AlertThreshold['metric'],
  ): AlertThreshold[] {
    const existing = (this.alertThresholds.get(productionId) ?? []).filter(
      (t) => t.metric !== metric,
    );
    this.alertThresholds.set(productionId, existing);
    return existing;
  }

  // ─── Log retention ───────────────────────────────────────────────────────────

  getRetentionConfig(productionId: string): RetentionConfig {
    return this.retentionConfigs.get(productionId) ?? { retentionDays: 30 };
  }

  setRetentionConfig(productionId: string, config: RetentionConfig): RetentionConfig {
    this.retentionConfigs.set(productionId, config);
    return config;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeOldTelemetry(): Promise<void> {
    const defaultRetentionDays = 30;

    // Build a set of cutoff dates per production from explicit configs
    const configs = [...this.retentionConfigs.entries()];

    if (configs.length === 0) {
      // Apply default retention globally
      const cutoff = new Date(Date.now() - defaultRetentionDays * 86_400_000);
      const { count } = await this.prisma.telemetryLog.deleteMany({
        where: { timestamp: { lt: cutoff } },
      });
      if (count > 0) this.logger.log(`Auto-purge: deleted ${count} telemetry rows (default ${defaultRetentionDays}d retention)`);
      return;
    }

    for (const [productionId, { retentionDays }] of configs) {
      const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
      const { count } = await this.prisma.telemetryLog.deleteMany({
        where: { productionId, timestamp: { lt: cutoff } },
      });
      if (count > 0) {
        this.logger.log(`Auto-purge [${productionId}]: deleted ${count} telemetry rows (${retentionDays}d retention)`);
      }
    }
  }
}