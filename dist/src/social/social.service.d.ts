import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
export interface SocialMessagePayload {
    productionId: string;
    platform: string;
    author: string;
    avatarUrl?: string;
    content: string;
    externalId?: string;
}
export declare class SocialService {
    private prisma;
    private eventEmitter;
    private readonly logger;
    private blacklists;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    setBlacklist(productionId: string, words: string[]): void;
    getBlacklist(productionId: string): string[];
    ingestMessage(productionId: string, payload: SocialMessagePayload): Promise<{
        id: string;
        productionId: string;
        status: string;
        content: string;
        platform: string;
        timestamp: Date;
        author: string;
        authorAvatar: string | null;
        externalId: string | null;
    }>;
    getMessages(productionId: string, status?: string): Promise<{
        id: string;
        productionId: string;
        status: string;
        content: string;
        platform: string;
        timestamp: Date;
        author: string;
        authorAvatar: string | null;
        externalId: string | null;
    }[]>;
    updateMessageStatus(productionId: string, messageId: string, status: string): Promise<{
        id: string;
        productionId: string;
        status: string;
        content: string;
        platform: string;
        timestamp: Date;
        author: string;
        authorAvatar: string | null;
        externalId: string | null;
    }>;
    createPoll(productionId: string, question: string, options: string[]): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: Prisma.JsonValue;
    }>;
    getActivePoll(productionId: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: Prisma.JsonValue;
    } | null>;
    votePoll(pollId: string, optionId: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: Prisma.JsonValue;
    }>;
    closePoll(productionId: string, pollId: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: Prisma.JsonValue;
    }>;
}
