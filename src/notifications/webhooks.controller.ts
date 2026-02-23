import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    UseGuards,
    Patch,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('productions/:productionId/webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) { }

    @Get()
    async getWebhooks(@Param('productionId') productionId: string) {
        return this.prisma.webhook.findMany({
            where: { productionId },
            orderBy: { createdAt: 'desc' },
        });
    }

    @Post()
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
    async deleteWebhook(@Param('id') id: string) {
        return this.prisma.webhook.delete({
            where: { id },
        });
    }

    @Post(':id/test')
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
}
