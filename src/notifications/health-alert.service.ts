import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsService } from '@/notifications/notifications.service';

const BITRATE_LOW_KBPS = 1500;

interface HealthStatsPayload {
  productionId: string;
  cpuUsage: number;
  skippedFrames: number;
  bitrate?: number;
  isStreaming: boolean;
  timestamp: string;
}

@Injectable()
export class HealthAlertService {
  private readonly logger = new Logger(HealthAlertService.name);

  private lastAlerts = new Map<string, number>();
  private readonly ALERT_COOLDOWN = 60000;

  constructor(
    private notificationsService: NotificationsService,
    private eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('production.health.stats')
  async handleHealthStats(payload: HealthStatsPayload) {
    if (!payload.isStreaming) return;

    const issues: string[] = [];

    if (payload.cpuUsage > 85) {
      issues.push(`CPU crítico: ${payload.cpuUsage.toFixed(1)}%`);
    }

    if (payload.skippedFrames > 0) {
      issues.push(`Frames perdidos: ${payload.skippedFrames}`);
    }

    if (payload.bitrate !== undefined && payload.bitrate < BITRATE_LOW_KBPS) {
      issues.push(`Bitrate bajo: ${payload.bitrate} kbps (mín. ${BITRATE_LOW_KBPS})`);
    }

    if (issues.length > 0) {
      await this.triggerAlert(payload.productionId, issues);
    }
  }

  private async triggerAlert(productionId: string, issues: string[]) {
    const now = Date.now();
    const lastTime = this.lastAlerts.get(productionId) ?? 0;

    if (now - lastTime < this.ALERT_COOLDOWN) return;

    this.lastAlerts.set(productionId, now);

    const message = issues.join(' · ');
    this.logger.warn(`Health Alert [${productionId}]: ${message}`);

    this.eventEmitter.emit('stream.health.alert', {
      productionId,
      issues,
      timestamp: new Date().toISOString(),
    });

    await this.notificationsService.sendNotification(
      productionId,
      `🚨 *Stream Health Warning*\n${issues.map((i) => `• ${i}`).join('\n')}`,
    );
  }
}
