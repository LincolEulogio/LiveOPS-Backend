import { SocialService } from './social.service';
export declare class SocialController {
    private readonly socialService;
    constructor(socialService: SocialService);
    getMessages(productionId: string, status?: string): Promise<{
        id: string;
        productionId: string;
        status: string;
        timestamp: Date;
        platform: string;
        author: string;
        authorAvatar: string | null;
        content: string;
        externalId: string | null;
    }[]>;
    injectMessage(productionId: string, payload: {
        platform: string;
        author: string;
        content: string;
        avatarUrl?: string;
        externalId?: string;
    }): Promise<{
        id: string;
        productionId: string;
        status: string;
        timestamp: Date;
        platform: string;
        author: string;
        authorAvatar: string | null;
        content: string;
        externalId: string | null;
    }>;
    updateStatus(productionId: string, id: string, status: string): Promise<{
        id: string;
        productionId: string;
        status: string;
        timestamp: Date;
        platform: string;
        author: string;
        authorAvatar: string | null;
        content: string;
        externalId: string | null;
    }>;
    createPoll(productionId: string, payload: {
        question: string;
        options: string[];
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        question: string;
        options: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
    }>;
    getActivePoll(productionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        question: string;
        options: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
    } | null>;
    votePoll(id: string, optionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        question: string;
        options: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
    }>;
    closePoll(productionId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        question: string;
        options: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
    }>;
    getBlacklist(productionId: string): string[];
    updateBlacklist(productionId: string, words: string[]): {
        words: string[];
    };
}
