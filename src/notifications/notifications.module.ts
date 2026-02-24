import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { HealthAlertService } from './health-alert.service';
import { WebhooksController } from './webhooks.controller';
import { PushNotificationsService } from './push-notifications.service';

@Global()
@Module({
    controllers: [WebhooksController],
    providers: [NotificationsService, HealthAlertService, PushNotificationsService],
    exports: [NotificationsService, PushNotificationsService],
})
export class NotificationsModule { }
