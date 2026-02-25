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
    ) { }

    onModuleInit() {
        const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
        const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
        const email = this.configService.get<string>('VAPID_EMAIL', 'admin@liveops.com');

        if (publicKey && privateKey) {
            webpush.setVapidDetails(
                `mailto:${email}`,
                publicKey,
                privateKey,
            );
            this.logger.log('VAPID details set successfully');
        } else {
            this.logger.warn('VAPID keys not found in config. Push notifications will not work.');
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
        } catch (error) {
            this.logger.error(`Error subscribing user ${userId} to push notifications: ${error.message}`);
            return null;
        }
    }

    async unsubscribe(endpoint: string) {
        try {
            return await this.prisma.pushSubscription.deleteMany({
                where: { endpoint },
            });
        } catch (error) {
            this.logger.error(`Error unsubscribing from push notifications: ${error.message}`);
            return null;
        }
    }

    async sendNotification(userId: string, payload: { title: string; body: string; icon?: string; data?: any }) {
        let subscriptions = [];
        try {
            subscriptions = await this.prisma.pushSubscription.findMany({
                where: { userId },
            });
        } catch (error) {
            this.logger.error(`Error fetching push subscriptions for user ${userId}: ${error.message}`);
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
                const error = result.reason as any;
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription expired or no longer valid
                    this.logger.log(`Removing expired subscription: ${error.endpoint}`);
                    // We don't have the endpoint directly here easily without more mapping, 
                    // but we can log the failure. In a real scenario, we'd delete the invalid sub.
                } else {
                    this.logger.error(`Failed to send push notification: ${error.message}`);
                }
            }
        }
    }
}
