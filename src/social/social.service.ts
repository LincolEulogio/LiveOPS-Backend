import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export class SocialComment {
    id: string;
    platform: 'youtube' | 'twitch' | 'facebook';
    author: string;
    avatar?: string;
    message: string;
    timestamp: string;
}

@Injectable()
export class SocialService {
    private readonly logger = new Logger(SocialService.name);
    private activeOverlays: Map<string, SocialComment> = new Map();

    constructor(private eventEmitter: EventEmitter2) { }

    // Mock method to simulate incoming comments
    // In production, this would be triggered by Webhooks or Polling
    async handleIncomingComment(productionId: string, comment: SocialComment) {
        this.logger.log(`New comment from ${comment.author} on ${comment.platform}`);
        this.eventEmitter.emit('social.comment_received', {
            productionId,
            comment,
        });
    }

    async selectCommentForOverlay(productionId: string, comment: SocialComment | null) {
        if (comment) {
            this.activeOverlays.set(productionId, comment);
            this.eventEmitter.emit('social.overlay_update', {
                productionId,
                comment,
            });
        } else {
            this.activeOverlays.delete(productionId);
            this.eventEmitter.emit('social.overlay_update', {
                productionId,
                comment: null,
            });
        }
    }

    getActiveOverlay(productionId: string) {
        return this.activeOverlays.get(productionId) || null;
    }
}
