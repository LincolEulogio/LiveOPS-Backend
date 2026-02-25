import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { PushNotificationsService } from '@/notifications/push-notifications.service';
import { CreateSubscriptionDto } from '@/notifications/dto/push-subscription.dto';
export declare class WebhooksController {
    private prisma;
    private readonly notificationsService;
    private readonly pushService;
    constructor(prisma: PrismaService, notificationsService: NotificationsService, pushService: PushNotificationsService);
    getWebhooks(productionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        productionId: string;
        url: string;
        isEnabled: boolean;
        platform: string;
    }[]>;
    createWebhook(productionId: string, data: {
        name: string;
        url: string;
        platform: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        productionId: string;
        url: string;
        isEnabled: boolean;
        platform: string;
    }>;
    updateWebhook(id: string, data: {
        name?: string;
        url?: string;
        isEnabled?: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        productionId: string;
        url: string;
        isEnabled: boolean;
        platform: string;
    }>;
    deleteWebhook(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        productionId: string;
        url: string;
        isEnabled: boolean;
        platform: string;
    }>;
    testWebhook(id: string): Promise<{
        success: boolean;
    }>;
    subscribe(req: any, subscription: CreateSubscriptionDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        auth: string;
        endpoint: string;
        p256dh: string;
    } | null>;
    unsubscribe(endpoint: string): Promise<import("@prisma/client").Prisma.BatchPayload | null>;
}
