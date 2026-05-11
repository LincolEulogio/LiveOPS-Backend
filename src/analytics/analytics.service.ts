import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
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

const METRICS_CACHE_TTL = 10_000; // 10s — fresh enough for live dashboards

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  private lastWriteTime = new Map<string, number>();
  private readonly WRITE_INTERVAL_MS = 5_000;

  private alertThresholds = new Map<string, AlertThreshold[]>();
  private retentionConfigs = new Map<string, RetentionConfig>();

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
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

  async generateShowReport(productionId: string) {
    try {
      const existing = await this.prisma.showReport.findUnique({
        where: { productionId },
      });
      if (existing) return existing;

      const [telemetry, timelineBlocks] = await Promise.all([
        this.prisma.telemetryLog.findMany({
          where: { productionId },
          orderBy: { timestamp: 'asc' },
        }),
        this.prisma.timelineBlock.findMany({
          where: { productionId },
          orderBy: { order: 'asc' },
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

      const report = await this.prisma.showReport.create({
        data: {
          productionId,
          startTime,
          endTime,
          durationMs,
          alertsCount: 0,
          peakViewers: 0,
          metrics: { totalDroppedFrames, maxCpu, avgFps, samples: telemetry.length },
        },
      });

      const aiAnalysis = await this.aiService.analyzeShowPerformance({
        durationMs,
        avgFps,
        maxCpu,
        totalDroppedFrames,
        samples: telemetry.length,
      });

      return this.prisma.showReport.update({
        where: { id: report.id },
        data: { aiAnalysis },
      });
    } catch (error: unknown) {
      this.logger.error(
        `Error generating show report for ${productionId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async getShowReport(productionId: string) {
    return this.prisma.showReport.findUnique({ where: { productionId } });
  }

  // ─── SEO ────────────────────────────────────────────────────────────────────

  async getPostShowSeo(productionId: string) {
    const [report, production] = await Promise.all([
      this.getShowReport(productionId),
      this.prisma.production.findUnique({
        where: { id: productionId },
        include: { script: true, timelineBlocks: true },
      }),
    ]);

    if (!report) throw new Error('No report found. Generate it first.');

    return this.aiService.generatePostShowSEO({
      name: production?.name ?? 'Show en Vivo',
      duration: `${Math.round((report.durationMs ?? 0) / 60000)} min`,
      topics: production?.timelineBlocks.map((b) => b.title).join(', ') ?? 'Varios',
    });
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