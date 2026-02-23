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
exports.SocialService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
let SocialService = SocialService_1 = class SocialService {
    eventEmitter;
    logger = new common_1.Logger(SocialService_1.name);
    messages = new Map();
    blacklists = new Map();
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.blacklists.set('default', ['spam', 'buy followers', 'scam']);
    }
    setBlacklist(productionId, words) {
        this.blacklists.set(productionId, words.map(w => w.toLowerCase()));
    }
    getBlacklist(productionId) {
        return this.blacklists.get(productionId) || [];
    }
    ingestMessage(productionId, payload) {
        const blacklist = this.getBlacklist(productionId);
        const isClean = !blacklist.some(word => payload.content.toLowerCase().includes(word));
        const message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            status: isClean ? 'pending' : 'rejected',
            ...payload,
        };
        const prodMessages = this.messages.get(productionId) || [];
        this.messages.set(productionId, [...prodMessages, message]);
        this.eventEmitter.emit('social.message.new', message);
        if (!isClean) {
            this.logger.debug(`Message rejected due to blacklist: ${message.content}`);
        }
        return message;
    }
    getMessages(productionId, status) {
        const prodMessages = this.messages.get(productionId) || [];
        if (status) {
            return prodMessages.filter(m => m.status === status);
        }
        return prodMessages;
    }
    updateMessageStatus(productionId, messageId, status) {
        const prodMessages = this.messages.get(productionId) || [];
        const idx = prodMessages.findIndex(m => m.id === messageId);
        if (idx !== -1) {
            if (status === 'on-air') {
                prodMessages.forEach(m => {
                    if (m.status === 'on-air')
                        m.status = 'approved';
                });
            }
            prodMessages[idx] = { ...prodMessages[idx], status };
            this.messages.set(productionId, prodMessages);
            this.eventEmitter.emit('social.message.updated', prodMessages[idx]);
            if (status === 'on-air') {
                this.eventEmitter.emit('graphics.social.show', prodMessages[idx]);
            }
            return prodMessages[idx];
        }
        return null;
    }
};
exports.SocialService = SocialService;
exports.SocialService = SocialService = SocialService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], SocialService);
//# sourceMappingURL=social.service.js.map