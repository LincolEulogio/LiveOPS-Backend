import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
export declare class WebhooksController {
    private prisma;
    private notificationsService;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
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
}
