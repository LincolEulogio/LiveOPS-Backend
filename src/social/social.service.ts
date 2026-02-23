import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class SocialService {
    private readonly logger = new Logger(SocialService.name);
    // In-memory store for messages per production (in a real app, use Redis or DB)
    private messages = new Map<string, SocialMessage[]>();
    private blacklists = new Map<string, string[]>(); // productionId -> blocked words

    constructor(private eventEmitter: EventEmitter2) {
        // Initialize with some default bad words for testing
        // In a real app, load from DB
        this.blacklists.set('default', ['spam', 'buy followers', 'scam']);
    }

    setBlacklist(productionId: string, words: string[]) {
        this.blacklists.set(productionId, words.map(w => w.toLowerCase()));
    }

    getBlacklist(productionId: string): string[] {
        return this.blacklists.get(productionId) || [];
    }

    // Simulate receiving a message from a webhook or polling service
    ingestMessage(productionId: string, payload: Omit<SocialMessage, 'id' | 'timestamp' | 'status'>) {
        const blacklist = this.getBlacklist(productionId);

        // Check against blacklist
        const isClean = !blacklist.some(word =>
            payload.content.toLowerCase().includes(word)
        );

        const message: SocialMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            status: isClean ? 'pending' : 'rejected',
            ...payload,
        };

        const prodMessages = this.messages.get(productionId) || [];
        this.messages.set(productionId, [...prodMessages, message]);

        // Fast-path: emit event to clients
        this.eventEmitter.emit('social.message.new', message);

        if (!isClean) {
            this.logger.debug(`Message rejected due to blacklist: ${message.content}`);
        }

        return message;
    }

    getMessages(productionId: string, status?: SocialMessage['status']) {
        const prodMessages = this.messages.get(productionId) || [];
        if (status) {
            return prodMessages.filter(m => m.status === status);
        }
        return prodMessages;
    }

    updateMessageStatus(productionId: string, messageId: string, status: SocialMessage['status']) {
        const prodMessages = this.messages.get(productionId) || [];
        const idx = prodMessages.findIndex(m => m.id === messageId);

        if (idx !== -1) {
            // If moving to on-air, we might want to change previous on-air back to approved
            if (status === 'on-air') {
                prodMessages.forEach(m => {
                    if (m.status === 'on-air') m.status = 'approved';
                });
            }

            prodMessages[idx] = { ...prodMessages[idx], status };
            this.messages.set(productionId, prodMessages);

            this.eventEmitter.emit('social.message.updated', prodMessages[idx]);

            // If 'on-air', perhaps trigger automation generic event
            if (status === 'on-air') {
                this.eventEmitter.emit('graphics.social.show', prodMessages[idx]);
            }

            return prodMessages[idx];
        }
        return null;
    }
}
