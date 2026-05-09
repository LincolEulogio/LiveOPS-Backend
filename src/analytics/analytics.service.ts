import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { AiService } from '@/ai/ai.service';
import type { ProductionHealthStats } from '@/streaming/streaming.types';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  // Throttle writes: mapping productionId -> lastWriteTimestamp
  private lastWriteTime: Map<string, number> = new Map();
  private readonly WRITE_INTERVAL_MS = 5000; // Save telemetry every 5 seconds per production

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  @OnEvent('production.health.stats')
  async handleProductionHealthStats(payload: ProductionHealthStats) {
    try {
      const { productionId } = payload;
      if (!productionId) return;

      const now = Date.now();
      const lastWrite = this.lastWriteTime.get(productionId) || 0;

      if (now - lastWrite < this.WRITE_INTERVAL_MS) {
        return; // Skip if we wrote too recently
      }

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
    } catch (error: unknown) {
      this.logger.error(
        `Failed to save telemetry for production ${payload.productionId}:`,
        error,
      );
    }
  }

  async getTelemetryLogs(productionId: string, minutes: number = 60) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.prisma.telemetryLog.findMany({
      where: {
        productionId,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  async generateShowReport(productionId: string) {
    try {
      // 1. Check if report already exists
      const existing = await this.prisma.showReport.findUnique({
        where: { productionId },
      });
      if (existing) return existing;

      // 2. Fetch data (telemetry, alerts, timeline blocks)
      const telemetry = await this.prisma.telemetryLog.findMany({
        where: { productionId },
        orderBy: { timestamp: 'asc' },
      });

      const timelineBlocks = await this.prisma.timelineBlock.findMany({
        where: { productionId },
        orderBy: { order: 'asc' },
      });

      // 3. Compute metrics
      const streamingLogs = telemetry.filter((t) => t.isStreaming);
      let startTime =
        streamingLogs.length > 0 ? streamingLogs[0].timestamp : undefined;
      let endTime =
        streamingLogs.length > 0
          ? streamingLogs[streamingLogs.length - 1].timestamp
          : undefined;

      let durationMs = 0;
      if (startTime && endTime) {
        durationMs = endTime.getTime() - startTime.getTime();
      } else {
        // Fallback to timeline blocks if stream wasn't detected
        const firstBlock = timelineBlocks.find((b) => b.startTime);
        const lastBlock = timelineBlocks.reverse().find((b) => b.endTime);
        if (firstBlock?.startTime && lastBlock?.endTime) {
          startTime = firstBlock.startTime;
          endTime = lastBlock.endTime;
          durationMs = endTime.getTime() - startTime.getTime();
        }
      }

      const totalDroppedFrames = telemetry.reduce(
        (sum, log) => sum + (log.droppedFrames || 0),
        0,
      );
      const maxCpu = Math.max(...telemetry.map((t) => t.cpuUsage || 0), 0);
      const avgFps = telemetry.length
        ? telemetry.reduce((sum, log) => sum + (log.fps || 0), 0) /
          telemetry.length
        : 0;

      // 4. Save Report
      const report = await this.prisma.showReport.create({
        data: {
          productionId,
          startTime,
          endTime,
          durationMs,
          alertsCount: 0, // Placeholder
          peakViewers: 0, // Placeholder
          metrics: {
            totalDroppedFrames,
            maxCpu,
            avgFps,
            samples: telemetry.length,
          },
        },
      });

      // 5. Generate AI Analysis asynchronously (don't block the initial return or do it before saving)
      // Actually, let's do it before final save or update it after.
      // For now, let's do it before creating the report so the first response has it.
      const aiAnalysis = await this.aiService.analyzeShowPerformance({
        durationMs,
        avgFps,
        maxCpu,
        totalDroppedFrames,
        samples: telemetry.length,
      });

      const updatedReport = await this.prisma.showReport.update({
        where: { id: report.id },
        data: { aiAnalysis },
      });

      return updatedReport;
    } catch (e: unknown) {
      this.logger.error(`Error generating show report for ${productionId}`, e);
      throw e;
    }
  }

  async getShowReport(productionId: string) {
    return this.prisma.showReport.findUnique({
      where: { productionId },
    });
  }

  async getPostShowSeo(productionId: string) {
    const report = await this.getShowReport(productionId);
    const production = await this.prisma.production.findUnique({
      where: { id: productionId },
      include: { script: true, timelineBlocks: true },
    });

    if (!report) throw new Error('No report found. Generate it first.');

    const data = {
      name: production?.name || 'Show en Vivo',
      duration: `${Math.round((report.durationMs || 0) / 60000)} min`,
      topics:
        production?.timelineBlocks.map((b) => b.title).join(', ') || 'Varios',
    };

    return this.aiService.generatePostShowSEO(data);
  }

  async getDashboardMetrics(productionId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // 1. Get recent telemetry for system integrity
    const recentTelemetry = await this.prisma.telemetryLog.findMany({
      where: { productionId, timestamp: { gte: oneHourAgo } },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    const avgDroppedFrames = recentTelemetry.length
      ? recentTelemetry.reduce((sum, t) => sum + (t.droppedFrames || 0), 0) /
        recentTelemetry.length
      : 0;

    const integrity =
      avgDroppedFrames > 10
        ? 'CRITICAL'
        : avgDroppedFrames > 2
          ? 'DEGRADED'
          : 'OPTIMAL';

    // 2. Get human activity count (unique users from production logs)
    const recentLogs = await this.prisma.productionLog.findMany({
      where: { productionId, createdAt: { gte: oneHourAgo } },
    });

    const uniqueUsers = new Set(recentLogs.map((l) => l.userId).filter(Boolean))
      .size;

    // 3. Count security alerts (e.g., AUTH_FAILURE)
    const securityAlerts = recentLogs.filter(
      (l) => l.eventType.includes('AUTH') || l.eventType.includes('FAILURE'),
    ).length;

    return {
      systemIntegrity: integrity,
      humanActivityCount: uniqueUsers || 1, // At least the current user
      securityAlertsCount: securityAlerts,
      lastSyncAt: new Date().toISOString(),
    };
  }
}
