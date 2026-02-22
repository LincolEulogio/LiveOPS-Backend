import { PrismaService } from '../prisma/prisma.service';
export declare class ChatService {
    private prisma;
    constructor(prisma: PrismaService);
    saveMessage(productionId: string, userId: string | null, message: string): Promise<{
        user: {
            name: string | null;
            id: string;
        } | null;
    } & {
        productionId: string;
        message: string;
        id: string;
        createdAt: Date;
        userId: string | null;
    }>;
    getChatHistory(productionId: string, limit?: number): Promise<({
        user: {
            name: string | null;
            id: string;
        } | null;
    } & {
        productionId: string;
        message: string;
        id: string;
        createdAt: Date;
        userId: string | null;
    })[]>;
}
