import { PrismaService } from '../prisma/prisma.service';
export declare enum NotificationPlatform {
    DISCORD = "DISCORD",
    SLACK = "SLACK",
    GENERIC = "GENERIC"
}
export declare class NotificationsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    sendNotification(productionId: string, message: string, platform?: NotificationPlatform): Promise<void>;
    private dispatchWebhook;
}
