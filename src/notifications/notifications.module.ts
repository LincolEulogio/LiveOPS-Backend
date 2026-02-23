import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { HealthAlertService } from './health-alert.service';
import { WebhooksController } from './webhooks.controller';

@Global()
@Module({
    controllers: [WebhooksController],
    providers: [NotificationsService, HealthAlertService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
