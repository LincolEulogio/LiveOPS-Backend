import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    UseGuards,
    Patch,
    Req, // Added Req for the new endpoints
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationPlatform, NotificationsService } from '@/notifications/notifications.service'; // Modified import
import { PushNotificationsService } from '@/notifications/push-notifications.service'; // Added import
import { CreateSubscriptionDto } from '@/notifications/dto/push-subscription.dto'; // Added import
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Request } from 'express'; // Added import

@Controller('notifications') // Changed controller path
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WebhooksController {
    constructor(
        private prisma: PrismaService, // Kept prisma service
        private readonly notificationsService: NotificationsService, // Modified constructor
        private readonly pushService: PushNotificationsService, // Added pushService
    ) { }

    @Get('webhooks/:productionId') // Modified path for getWebhooks
    @Permissions('webhook:view')
    async getWebhooks(@Param('productionId') productionId: string) {
        // The original implementation for getWebhooks is moved here,
        // but the instruction only provided a placeholder comment.
        // I will keep the original implementation here as it was not explicitly removed.
        return this.prisma.webhook.findMany({
            where: { productionId },
            orderBy: { createdAt: 'desc' },
        });
    }

    @Post('webhooks') // Modified path for createWebhook
    @Permissions('webhook:manage')
    async createWebhook(
        @Param('productionId') productionId: string,
        @Body() data: { name: string; url: string; platform: string },
    ) {
        return this.prisma.webhook.create({
            data: {
                ...data,
                productionId,
            },
        });
    }

    @Patch(':id')
    @Permissions('webhook:manage')
    async updateWebhook(
        @Param('id') id: string,
        @Body() data: { name?: string; url?: string; isEnabled?: boolean },
    ) {
        return this.prisma.webhook.update({
            where: { id },
            data,
        });
    }

    @Delete(':id')
    @Permissions('webhook:manage')
    async deleteWebhook(@Param('id') id: string) {
        return this.prisma.webhook.delete({
            where: { id },
        });
    }

    @Post(':id/test')
    @Permissions('webhook:manage')
    async testWebhook(@Param('id') id: string) {
        const webhook = await this.prisma.webhook.findUnique({
            where: { id },
        });

        if (!webhook) {
            throw new Error('Webhook not found');
        }

        await this.notificationsService.sendNotification(
            webhook.productionId,
            `🔄 *LiveOPS Webhook Test*\nThis is a test notification for the ${webhook.name} integration.`,
            webhook.platform as any,
        );

        return { success: true };
    }

    @Post('push/subscribe')
    async subscribe(@Req() req: any, @Body() subscription: CreateSubscriptionDto) {
        return this.pushService.subscribe(req.user.id, subscription);
    }

    @Delete('push/unsubscribe')
    async unsubscribe(@Body('endpoint') endpoint: string) {
        return this.pushService.unsubscribe(endpoint);
    }
}
