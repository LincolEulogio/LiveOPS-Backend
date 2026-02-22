import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
    constructor(private prisma: PrismaService) { }

    async saveMessage(productionId: string, userId: string, message: string) {
        return this.prisma.chatMessage.create({
            data: {
                productionId,
                userId,
                message,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    async getChatHistory(productionId: string, limit: number = 100) {
        return this.prisma.chatMessage.findMany({
            where: { productionId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
    }
}
