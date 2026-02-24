import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
export declare class PushNotificationsService implements OnModuleInit {
    private prisma;
    private configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    onModuleInit(): void;
    subscribe(userId: string, subscription: webpush.PushSubscription): Promise<{
        id: string;
        createdAt: Date;
        endpoint: string;
        userId: string;
        p256dh: string;
        auth: string;
    } | null>;
    unsubscribe(endpoint: string): Promise<import("@prisma/client").Prisma.BatchPayload | null>;
    sendNotification(userId: string, payload: {
        title: string;
        body: string;
        icon?: string;
        data?: any;
    }): Promise<void>;
}
