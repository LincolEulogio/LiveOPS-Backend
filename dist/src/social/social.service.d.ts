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
        productionId: string;
        id: string;
        timestamp: Date;
        status: string;
        platform: string;
        author: string;
        authorAvatar: string | null;
        content: string;
        externalId: string | null;
        aiSentiment: string | null;
        aiCategory: string | null;
    }>;
    getMessages(productionId: string, status?: string): Promise<{
        productionId: string;
        id: string;
        timestamp: Date;
        status: string;
        platform: string;
        author: string;
        authorAvatar: string | null;
        content: string;
        externalId: string | null;
        aiSentiment: string | null;
        aiCategory: string | null;
    }[]>;
    updateMessageStatus(productionId: string, messageId: string, status: string): Promise<{
        productionId: string;
        id: string;
        timestamp: Date;
        status: string;
        platform: string;
        author: string;
        authorAvatar: string | null;
        content: string;
        externalId: string | null;
        aiSentiment: string | null;
        aiCategory: string | null;
    }>;
    createPoll(productionId: string, question: string, options: string[]): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: Prisma.JsonValue;
    }>;
    getActivePoll(productionId: string): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: Prisma.JsonValue;
    } | null>;
    votePoll(pollId: string, optionId: string): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: Prisma.JsonValue;
    }>;
    closePoll(productionId: string, pollId: string): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: Prisma.JsonValue;
    }>;
}
