import { SocialService } from './social.service';
export declare class SocialController {
    private readonly socialService;
    constructor(socialService: SocialService);
    getMessages(productionId: string, status?: string): Promise<{
        id: string;
        productionId: string;
        status: string;
        platform: string;
        author: string;
        authorAvatar: string | null;
        content: string;
        externalId: string | null;
        timestamp: Date;
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
        platform: string;
        author: string;
        authorAvatar: string | null;
        content: string;
        externalId: string | null;
        timestamp: Date;
    }>;
    updateStatus(productionId: string, id: string, status: string): Promise<{
        id: string;
        productionId: string;
        status: string;
        platform: string;
        author: string;
        authorAvatar: string | null;
        content: string;
        externalId: string | null;
        timestamp: Date;
    }>;
    createPoll(productionId: string, payload: {
        question: string;
        options: string[];
    }): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: import("@prisma/client/runtime/client").JsonValue;
    }>;
    getActivePoll(productionId: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: import("@prisma/client/runtime/client").JsonValue;
    } | null>;
    votePoll(id: string, optionId: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        updatedAt: Date;
        isActive: boolean;
        question: string;
        options: import("@prisma/client/runtime/client").JsonValue;
    }>;
    closePoll(productionId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
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
