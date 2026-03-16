import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import axios from 'axios';

import { PushNotificationsService } from './push-notifications.service';

export enum NotificationPlatform {
  DISCORD = 'DISCORD',
  SLACK = 'SLACK',
  PUSH = 'PUSH',
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

  constructor(
    private prisma: PrismaService,
    private pushService: PushNotificationsService,
  ) {}

  async sendNotification(
    productionId: string,
    message: string,
    options?: {
      platform?: NotificationPlatform;
      userId?: string; // Para push directo
      title?: string;
    },
  ) {
    // 1. Webhooks (Discord, Slack, Generic)
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        productionId,
        isEnabled: true,
        ...(options?.platform && options.platform !== NotificationPlatform.PUSH ? { platform: options.platform } : {}),
      },
    });

    if (webhooks.length > 0) {
      await Promise.allSettled(
        webhooks.map((webhook) => this.dispatchWebhook(webhook, message)),
      );
    }

    // 2. Push Notifications (Si no se filtró por una plataforma específica distinta de PUSH)
    if (!options?.platform || options.platform === NotificationPlatform.PUSH) {
      // Si tenemos un userId, enviamos directo. Si no, enviamos a todos los operadores de la producción.
      if (options?.userId) {
        await this.pushService.sendNotification(options.userId, {
          title: options.title || 'LiveOPS Alert',
          body: message,
        });
      } else {
        // Buscar usuarios con acceso a esta producción (roles con permisos de visualización)
        const productionUsers = await this.prisma.productionUser.findMany({
          where: { productionId },
          select: { userId: true },
        });

        if (productionUsers.length > 0) {
          await Promise.allSettled(
            productionUsers.map((up: { userId: string }) =>
              this.pushService.sendNotification(up.userId, {
                title: options?.title || 'LiveOPS Alert',
                body: message,
              }),
            ),
          );
        }
      }
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
      this.logger.log(
        `Successfully dispatched notification to ${webhook.name} (${webhook.platform})`,
      );
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to dispatch notification to ${webhook.name}: ${err.message}`,
      );
      throw err;
    }
  }
}
