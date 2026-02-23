import { SocialService } from './social.service';
export declare class SocialController {
    private readonly socialService;
    constructor(socialService: SocialService);
    getMessages(productionId: string): import("./social.service").SocialMessage[];
    injectMessage(productionId: string, payload: {
        platform: 'twitch' | 'youtube';
        author: string;
        content: string;
        avatarUrl?: string;
    }): import("./social.service").SocialMessage;
    updateStatus(productionId: string, id: string, status: 'pending' | 'approved' | 'rejected' | 'on-air'): import("./social.service").SocialMessage | null;
    getBlacklist(productionId: string): string[];
    updateBlacklist(productionId: string, words: string[]): {
        words: string[];
    };
}
