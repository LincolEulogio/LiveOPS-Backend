"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SocialService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialService = exports.SocialComment = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
class SocialComment {
    id;
    platform;
    author;
    avatar;
    message;
    timestamp;
}
exports.SocialComment = SocialComment;
let SocialService = SocialService_1 = class SocialService {
    eventEmitter;
    logger = new common_1.Logger(SocialService_1.name);
    activeOverlays = new Map();
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
    }
    async handleIncomingComment(productionId, comment) {
        this.logger.log(`New comment from ${comment.author} on ${comment.platform}`);
        this.eventEmitter.emit('social.comment_received', {
            productionId,
            comment,
        });
    }
    async selectCommentForOverlay(productionId, comment) {
        if (comment) {
            this.activeOverlays.set(productionId, comment);
            this.eventEmitter.emit('social.overlay_update', {
                productionId,
                comment,
            });
        }
        else {
            this.activeOverlays.delete(productionId);
            this.eventEmitter.emit('social.overlay_update', {
                productionId,
                comment: null,
            });
        }
    }
    getActiveOverlay(productionId) {
        return this.activeOverlays.get(productionId) || null;
    }
};
exports.SocialService = SocialService;
exports.SocialService = SocialService = SocialService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], SocialService);
//# sourceMappingURL=social.service.js.map