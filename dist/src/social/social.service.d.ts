import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { AiService } from '@/ai/ai.service';
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
    private aiService;
    private readonly logger;
    private blacklists;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2, aiService: AiService);
    setBlacklist(productionId: string, words: string[]): void;
    getBlacklist(productionId: string): string[];
    ingestMessage(productionId: string, payload: SocialMessagePayload): Promise<{
        id: string;
        status: string;
        productionId: string;
        timestamp: Date;
        platform: string;
        author: string;
        authorAvatar: string | null;
        content: string;
        externalId: string | null;
        aiSentiment: string | null;
        aiCategory: string | null;
    }>;
    getMessages(productionId: string, status?: string): Promise<{
        id: string;
        status: string;
        productionId: string;
        timestamp: Date;
        platform: string;
        author: string;
        authorAvatar: string | null;
        content: string;
        externalId: string | null;
        aiSentiment: string | null;
        aiCategory: string | null;
    }[]>;
    updateMessageStatus(productionId: string, messageId: string, status: string): Promise<{
        id: string;
        status: string;
        productionId: string;
        timestamp: Date;
        platform: string;
        author: string;
        authorAvatar: string | null;
        content: string;
        externalId: string | null;
        aiSentiment: string | null;
        aiCategory: string | null;
    }>;
    createPoll(productionId: string, question: string, options: string[]): Promise<{
        id: string;
        options: Prisma.JsonValue;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
    }>;
    getActivePoll(productionId: string): Promise<{
        id: string;
        options: Prisma.JsonValue;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
    } | null>;
    votePoll(pollId: string, optionId: string): Promise<{
        id: string;
        options: Prisma.JsonValue;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
    }>;
    closePoll(productionId: string, pollId: string): Promise<{
        id: string;
        options: Prisma.JsonValue;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
    }>;
}
