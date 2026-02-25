import { Module, Global } from '@nestjs/common';
import { NotificationsService } from '@/notifications/notifications.service';
import { HealthAlertService } from '@/notifications/health-alert.service';
import { WebhooksController } from '@/notifications/webhooks.controller';
import { PushNotificationsService } from '@/notifications/push-notifications.service';

@Global()
@Module({
    controllers: [WebhooksController],
    providers: [NotificationsService, HealthAlertService, PushNotificationsService],
    exports: [NotificationsService, PushNotificationsService],
})
export class NotificationsModule { }
