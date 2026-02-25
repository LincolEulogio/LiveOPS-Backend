import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService, NotificationPlatform } from '@/notifications/notifications.service';

@Injectable()
export class HealthAlertService {
    private readonly logger = new Logger(HealthAlertService.name);

    // Track last alert time to avoid spamming
    private lastAlerts = new Map<string, number>();
    private readonly ALERT_COOLDOWN = 60000; // 60 seconds

    constructor(private notificationsService: NotificationsService) { }

    @OnEvent('production.health.stats')
    async handleHealthStats(payload: {
        productionId: string;
        cpuUsage: number;
        skippedFrames: number;
        isStreaming: boolean;
        timestamp: string;
    }) {
        if (!payload.isStreaming) return;

        const issues: string[] = [];

        // Check CPU
        if (payload.cpuUsage > 85) {
            issues.push(`🔥 Critical CPU Usage: ${payload.cpuUsage.toFixed(1)}%`);
        }

        // Check Skipped Frames (simplified logic: if frames are skipping at all during streaming)
        if (payload.skippedFrames > 0) {
            issues.push(`⚠️ Dropped Frames Detected: ${payload.skippedFrames}`);
        }

        if (issues.length > 0) {
            await this.triggerAlert(payload.productionId, issues.join('\n'));
        }
    }

    private async triggerAlert(productionId: string, message: string) {
        const now = Date.now();
        const lastTime = this.lastAlerts.get(productionId) || 0;

        if (now - lastTime < this.ALERT_COOLDOWN) {
            return; // Cool down
        }

        this.logger.warn(`Health Alert for ${productionId}: ${message}`);
        this.lastAlerts.set(productionId, now);

        await this.notificationsService.sendNotification(
            productionId,
            `🚨 *Stream Health Warning*\n${message}`,
        );
    }
}
