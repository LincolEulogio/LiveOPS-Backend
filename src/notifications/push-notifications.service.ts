import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

@Injectable()
export class PushNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY')?.trim();
    const email = this.configService.get<string>(
      'VAPID_EMAIL',
      'admin@liveops.com',
    );

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'VAPID keys not found in config. Push notifications will not work.',
      );
      return;
    }

    if (!this.isValidVapidPublicKey(publicKey)) {
      this.logger.error(
        'Invalid VAPID_PUBLIC_KEY. Expected a base64url-encoded public key that decodes to 65 bytes. Push notifications will be disabled.',
      );
      return;
    }

    try {
      webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
      this.logger.log('VAPID details set successfully');
    } catch (error: unknown) {
      this.logger.error(
        `Failed to configure VAPID details: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private isValidVapidPublicKey(publicKey: string) {
    const normalizedKey = publicKey.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalizedKey.length % 4)) % 4);

    try {
      return Buffer.from(normalizedKey + padding, 'base64').length === 65;
    } catch {
      return false;
    }
  }

  async subscribe(userId: string, subscription: webpush.PushSubscription) {
    const { endpoint, keys } = subscription;

    try {
      return await this.prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
          userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        create: {
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });
    } catch (error: unknown) {
      this.logger.error(
        `Error subscribing user ${userId} to push notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async unsubscribe(endpoint: string) {
    try {
      return await this.prisma.pushSubscription.deleteMany({
        where: { endpoint },
      });
    } catch (error: unknown) {
      this.logger.error(
        `Error unsubscribing from push notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async sendNotification(
    userId: string,
    payload: {
      title: string;
      body: string;
      icon?: string;
      data?: Record<string, unknown>;
    },
  ) {
    let subscriptions: {
      endpoint: string;
      p256dh: string;
      auth: string;
    }[] = [];
    try {
      subscriptions = await this.prisma.pushSubscription.findMany({
        where: { userId },
      });
    } catch (error: unknown) {
      this.logger.error(
        `Error fetching push subscriptions for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }

    if (subscriptions.length === 0) {
      this.logger.debug(`No push subscriptions found for user ${userId}`);
      return;
    }

    const notificationPayload = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subscriptions.map((sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        return webpush.sendNotification(pushSubscription, notificationPayload);
      }),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        const error = result.reason as {
          statusCode?: number;
          endpoint?: string;
          message?: string;
        };
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or no longer valid
          this.logger.log(`Removing expired subscription: ${error.endpoint}`);
          // We don't have the endpoint directly here easily without more mapping,
          // but we can log the failure. In a real scenario, we'd delete the invalid sub.
        } else {
          const message = error.message || 'Unknown push error';
          this.logger.error(`Failed to send push notification: ${message}`);
        }
      }
    }
  }
}
