import { SocialService } from '@/social/social.service';
export declare class SocialController {
    private readonly socialService;
    constructor(socialService: SocialService);
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
    injectMessage(productionId: string, payload: {
        platform: string;
        author: string;
        content: string;
        avatarUrl?: string;
        externalId?: string;
    }): Promise<{
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
    updateStatus(productionId: string, id: string, status: string): Promise<{
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
    createPoll(productionId: string, payload: {
        question: string;
        options: string[];
    }): Promise<{
        id: string;
        options: import("@prisma/client/runtime/client").JsonValue;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
    }>;
    getActivePoll(productionId: string): Promise<{
        id: string;
        options: import("@prisma/client/runtime/client").JsonValue;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
    } | null>;
    votePoll(id: string, optionId: string): Promise<{
        id: string;
        options: import("@prisma/client/runtime/client").JsonValue;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
    }>;
    closePoll(productionId: string, id: string): Promise<{
        id: string;
        options: import("@prisma/client/runtime/client").JsonValue;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
    }>;
    getBlacklist(productionId: string): string[];
    updateBlacklist(productionId: string, words: string[]): {
        words: string[];
    };
}
