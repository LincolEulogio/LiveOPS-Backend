import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { PushNotificationsService } from './push-notifications.service';
import { CreateSubscriptionDto } from './dto/push-subscription.dto';
export declare class WebhooksController {
    private prisma;
    private readonly notificationsService;
    private readonly pushService;
    constructor(prisma: PrismaService, notificationsService: NotificationsService, pushService: PushNotificationsService);
    getWebhooks(productionId: string): Promise<{
        id: string;
        productionId: string;
        name: string;
        url: string;
        platform: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createWebhook(productionId: string, data: {
        name: string;
        url: string;
        platform: string;
    }): Promise<{
        id: string;
        productionId: string;
        name: string;
        url: string;
        platform: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateWebhook(id: string, data: {
        name?: string;
        url?: string;
        isEnabled?: boolean;
    }): Promise<{
        id: string;
        productionId: string;
        name: string;
        url: string;
        platform: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteWebhook(id: string): Promise<{
        id: string;
        productionId: string;
        name: string;
        url: string;
        platform: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    testWebhook(id: string): Promise<{
        success: boolean;
    }>;
    subscribe(req: any, subscription: CreateSubscriptionDto): Promise<{
        id: string;
        createdAt: Date;
        endpoint: string;
        userId: string;
        p256dh: string;
        auth: string;
    } | null>;
    unsubscribe(endpoint: string): Promise<import("@prisma/client").Prisma.BatchPayload | null>;
}
