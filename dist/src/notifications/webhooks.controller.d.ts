import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
export declare class WebhooksController {
    private prisma;
    private notificationsService;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    getWebhooks(productionId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
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
        name: string;
        createdAt: Date;
        updatedAt: Date;
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
        name: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        url: string;
        isEnabled: boolean;
        platform: string;
    }>;
    deleteWebhook(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        url: string;
        isEnabled: boolean;
        platform: string;
    }>;
    testWebhook(id: string): Promise<{
        success: boolean;
    }>;
}
