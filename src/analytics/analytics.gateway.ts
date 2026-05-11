import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import type { ProductionHealthStats } from '@/streaming/streaming.types';
import type { AlertThreshold } from '@/analytics/analytics.types';
import { AnalyticsService } from '@/analytics/analytics.service';

const GATEWAY_CORS = {
  origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3001').split(','),
  credentials: true,
};

@WebSocketGateway({ cors: GATEWAY_CORS })
export class AnalyticsGateway {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(AnalyticsGateway.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @OnEvent('production.health.stats')
  async handleHealthStats(payload: ProductionHealthStats): Promise<void> {
    const { productionId } = payload;
    if (!productionId) return;

    // Stream live metrics to the production room
    this.server.to(`production_${productionId}`).emit('analytics.metrics', {
      productionId,
      timestamp: payload.timestamp ?? new Date().toISOString(),
      cpuUsage: payload.cpuUsage,
      memoryUsage: payload.memoryUsage,
      fps: payload.fps,
      bitrate: payload.bitrate ?? 0,
      droppedFrames: payload.skippedFrames ?? 0,
      isStreaming: payload.isStreaming,
      isRecording: payload.isRecording,
      gpuUsage: payload.gpuUsage,
    });

    // Evaluate thresholds and emit alerts for any breaches
    const thresholds = this.analyticsService.getAlertThresholds(productionId);
    this.emitThresholdAlerts(productionId, payload, thresholds);
  }

  private emitThresholdAlerts(
    productionId: string,
    payload: ProductionHealthStats,
    thresholds: AlertThreshold[],
  ): void {
    if (!thresholds.length) return;

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

      if (!breached) continue;

      const alert = {
        productionId,
        metric: threshold.metric,
        label: threshold.label,
        operator: threshold.operator,
        threshold: threshold.value,
        current,
        timestamp: new Date().toISOString(),
      };

      this.server.to(`production_${productionId}`).emit('analytics.alert', alert);
      this.logger.warn(
        `Threshold alert [${productionId}] ${threshold.label}: ${threshold.metric}=${current} ${threshold.operator} ${threshold.value}`,
      );
    }
  }
}