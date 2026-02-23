import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductionHealthStats } from '../obs/obs-connection.manager';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  // Throttle writes: mapping productionId -> lastWriteTimestamp
  private lastWriteTime: Map<string, number> = new Map();
  private readonly WRITE_INTERVAL_MS = 5000; // Save telemetry every 5 seconds per production

  constructor(private prisma: PrismaService) { }

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
    } catch (error) {
      this.logger.error(`Failed to save telemetry for production ${payload.productionId}:`, error);
    }
  }

  async getTelemetryLogs(productionId: string, minutes: number = 60) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.prisma.telemetryLog.findMany({
      where: {
        productionId,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' }
    });
  }

  async generateShowReport(productionId: string) {
    try {
      // 1. Check if report already exists
      const existing = await this.prisma.showReport.findUnique({
        where: { productionId }
      });
      if (existing) return existing;

      // 2. Fetch data (telemetry, alerts, timeline blocks)
      const telemetry = await this.prisma.telemetryLog.findMany({
        where: { productionId },
        orderBy: { timestamp: 'asc' }
      });

      const timelineBlocks = await this.prisma.timelineBlock.findMany({
        where: { productionId },
        orderBy: { order: 'asc' }
      });

      // 3. Compute metrics
      const streamingLogs = telemetry.filter(t => t.isStreaming);
      let startTime = streamingLogs.length > 0 ? streamingLogs[0].timestamp : undefined;
      let endTime = streamingLogs.length > 0 ? streamingLogs[streamingLogs.length - 1].timestamp : undefined;

      let durationMs = 0;
      if (startTime && endTime) {
        durationMs = endTime.getTime() - startTime.getTime();
      } else {
        // Fallback to timeline blocks if stream wasn't detected
        const firstBlock = timelineBlocks.find(b => b.startTime);
        const lastBlock = timelineBlocks.reverse().find(b => b.endTime);
        if (firstBlock?.startTime && lastBlock?.endTime) {
          startTime = firstBlock.startTime;
          endTime = lastBlock.endTime;
          durationMs = endTime.getTime() - startTime.getTime();
        }
      }

      const totalDroppedFrames = telemetry.reduce((sum, log) => sum + (log.droppedFrames || 0), 0);
      const maxCpu = Math.max(...telemetry.map(t => t.cpuUsage || 0), 0);
      const avgFps = telemetry.length ? telemetry.reduce((sum, log) => sum + (log.fps || 0), 0) / telemetry.length : 0;

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
            samples: telemetry.length
          }
        }
      });

      return report;

    } catch (e) {
      this.logger.error(`Error generating show report for ${productionId}`, e);
      throw e;
    }
  }

  async getShowReport(productionId: string) {
    return this.prisma.showReport.findUnique({
      where: { productionId }
    });
  }
}
