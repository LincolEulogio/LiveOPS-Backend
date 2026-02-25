import { PrismaService } from '@/prisma/prisma.service';
export declare class ChatService {
    private prisma;
    constructor(prisma: PrismaService);
    saveMessage(productionId: string, userId: string | null, message: string): Promise<{
        user: {
            id: string;
            name: string | null;
        } | null;
    } & {
        id: string;
        userId: string | null;
        createdAt: Date;
        productionId: string;
        message: string;
    }>;
    getChatHistory(productionId: string, limit?: number): Promise<({
        user: {
            id: string;
            name: string | null;
        } | null;
    } & {
        id: string;
        userId: string | null;
        createdAt: Date;
        productionId: string;
        message: string;
    })[]>;
}
