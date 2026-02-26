import { SocialService } from '@/social/social.service';
export declare class SocialController {
    private readonly socialService;
    constructor(socialService: SocialService);
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
    injectMessage(productionId: string, payload: {
        platform: string;
        author: string;
        content: string;
        avatarUrl?: string;
        externalId?: string;
    }): Promise<{
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
    updateStatus(productionId: string, id: string, status: string): Promise<{
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
    createPoll(productionId: string, payload: {
        question: string;
        options: string[];
    }): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: import("@prisma/client/runtime/client").JsonValue;
    }>;
    getActivePoll(productionId: string): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: import("@prisma/client/runtime/client").JsonValue;
    } | null>;
    votePoll(id: string, optionId: string): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: import("@prisma/client/runtime/client").JsonValue;
    }>;
    closePoll(productionId: string, id: string): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: import("@prisma/client/runtime/client").JsonValue;
    }>;
    getBlacklist(productionId: string): string[];
    updateBlacklist(productionId: string, words: string[]): {
        words: string[];
    };
}
