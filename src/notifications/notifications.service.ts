import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import axios from 'axios';

export enum NotificationPlatform {
    DISCORD = 'DISCORD',
    SLACK = 'SLACK',
    GENERIC = 'GENERIC',
}

interface WebhookType {
    id: string;
    productionId: string;
    name: string;
    url: string;
    platform: string;
    isEnabled: boolean;
}

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private prisma: PrismaService) { }

    async sendNotification(
        productionId: string,
        message: string,
        platform?: NotificationPlatform,
    ) {
        const webhooks = await this.prisma.webhook.findMany({
            where: {
                productionId,
                isEnabled: true,
                ...(platform ? { platform } : {}),
            },
        });

        if (webhooks.length === 0) {
            this.logger.debug(`No enabled webhooks found for production ${productionId}`);
            return;
        }

        const results = await Promise.allSettled(
            webhooks.map((webhook) => this.dispatchWebhook(webhook, message)),
        );

        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
            this.logger.error(`${failures.length} webhook dispatches failed.`);
        }
    }

    private async dispatchWebhook(webhook: WebhookType, message: string) {
        try {
            let payload: unknown;

            if (webhook.platform === NotificationPlatform.DISCORD) {
                payload = {
                    content: null,
                    embeds: [
                        {
                            title: 'LiveOPS Alert',
                            description: message,
                            color: 5814783, // Blurple-ish
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Source: ${webhook.name}`,
                            },
                        },
                    ],
                };
            } else if (webhook.platform === NotificationPlatform.SLACK) {
                payload = {
                    text: `*LiveOPS Alert:* ${message}`,
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkd-short',
                                text: `*LiveOPS Alert*\n${message}`,
                            },
                        },
                    ],
                };
            } else {
                payload = { message, timestamp: new Date().toISOString() };
            }

            await axios.post(webhook.url, payload);
            this.logger.log(`Successfully dispatched notification to ${webhook.name} (${webhook.platform})`);
        } catch (error: unknown) {
            const err = error as Error;
            this.logger.error(`Failed to dispatch notification to ${webhook.name}: ${err.message}`);
            throw err;
        }
    }
}
