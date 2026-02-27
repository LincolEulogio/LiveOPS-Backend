import { SocialService } from '@/social/social.service';
export declare class SocialController {
    private readonly socialService;
    constructor(socialService: SocialService);
    getMessages(productionId: string, status?: string): Promise<{
        id: string;
        status: string;
        productionId: string;
        author: string;
        content: string;
        platform: string;
        timestamp: Date;
        authorAvatar: string | null;
        externalId: string | null;
        aiSentiment: string | null;
        aiCategory: string | null;
    }[]>;
    getAiHighlights(productionId: string): Promise<any[]>;
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
        author: string;
        content: string;
        platform: string;
        timestamp: Date;
        authorAvatar: string | null;
        externalId: string | null;
        aiSentiment: string | null;
        aiCategory: string | null;
    }>;
    updateStatus(productionId: string, id: string, status: string): Promise<{
        id: string;
        status: string;
        productionId: string;
        author: string;
        content: string;
        platform: string;
        timestamp: Date;
        authorAvatar: string | null;
        externalId: string | null;
        aiSentiment: string | null;
        aiCategory: string | null;
    }>;
    createPoll(productionId: string, payload: {
        question: string;
        options: string[];
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        options: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
        question: string;
    }>;
    getActivePoll(productionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        options: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
        question: string;
    } | null>;
    votePoll(id: string, optionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        options: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
        question: string;
    }>;
    closePoll(productionId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        options: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
        question: string;
    }>;
    getBlacklist(productionId: string): string[];
    updateBlacklist(productionId: string, words: string[]): {
        words: string[];
    };
}
