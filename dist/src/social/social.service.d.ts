import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class SocialComment {
    id: string;
    platform: 'youtube' | 'twitch' | 'facebook';
    author: string;
    avatar?: string;
    message: string;
    timestamp: string;
}
export declare class SocialService {
    private eventEmitter;
    private readonly logger;
    private activeOverlays;
    constructor(eventEmitter: EventEmitter2);
    handleIncomingComment(productionId: string, comment: SocialComment): Promise<void>;
    selectCommentForOverlay(productionId: string, comment: SocialComment | null): Promise<void>;
    getActiveOverlay(productionId: string): SocialComment | null;
}
