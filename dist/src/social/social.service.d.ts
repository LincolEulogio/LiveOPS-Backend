import { EventEmitter2 } from '@nestjs/event-emitter';
export interface SocialMessage {
    id: string;
    productionId: string;
    platform: 'twitch' | 'youtube';
    author: string;
    avatarUrl?: string;
    content: string;
    timestamp: Date;
    status: 'pending' | 'approved' | 'rejected' | 'on-air';
}
export declare class SocialService {
    private eventEmitter;
    private readonly logger;
    private messages;
    private blacklists;
    constructor(eventEmitter: EventEmitter2);
    setBlacklist(productionId: string, words: string[]): void;
    getBlacklist(productionId: string): string[];
    ingestMessage(productionId: string, payload: Omit<SocialMessage, 'id' | 'timestamp' | 'status'>): SocialMessage;
    getMessages(productionId: string, status?: SocialMessage['status']): SocialMessage[];
    updateMessageStatus(productionId: string, messageId: string, status: SocialMessage['status']): SocialMessage | null;
}
