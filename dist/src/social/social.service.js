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
const prisma_service_1 = require("../prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
let SocialService = SocialService_1 = class SocialService {
    prisma;
    eventEmitter;
    aiService;
    logger = new common_1.Logger(SocialService_1.name);
    blacklists = new Map();
    constructor(prisma, eventEmitter, aiService) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.aiService = aiService;
        this.blacklists.set('default', ['spam', 'buy followers', 'scam']);
    }
    setBlacklist(productionId, words) {
        this.blacklists.set(productionId, words.map((w) => w.toLowerCase()));
    }
    getBlacklist(productionId) {
        return this.blacklists.get(productionId) || [];
    }
    async ingestMessage(productionId, payload) {
        const blacklist = this.getBlacklist(productionId);
        const isClean = !blacklist.some((word) => payload.content.toLowerCase().includes(word));
        let aiSentiment = 'NEUTRAL';
        let aiCategory = 'COMENTARIO';
        let isToxic = false;
        try {
            const aiResult = await this.aiService.analyzeSocialMessage(payload.content);
            aiSentiment = aiResult.sentiment;
            aiCategory = aiResult.category;
            isToxic = aiResult.isToxic;
        }
        catch (e) {
            this.logger.warn('AI social analysis failed, continuing with defaults');
        }
        const status = !isClean || isToxic ? 'REJECTED' : 'PENDING';
        const message = await this.prisma.socialMessage.create({
            data: {
                productionId,
                platform: payload.platform,
                author: payload.author,
                authorAvatar: payload.avatarUrl,
                content: payload.content,
                externalId: payload.externalId,
                status,
                aiSentiment,
                aiCategory,
            },
        });
        this.eventEmitter.emit('social.message.new', message);
        if (!isClean) {
            this.logger.debug(`Message rejected due to blacklist: ${message.content}`);
        }
        return message;
    }
    async getMessages(productionId, status) {
        return this.prisma.socialMessage.findMany({
            where: {
                productionId,
                ...(status ? { status } : {}),
            },
            orderBy: { timestamp: 'desc' },
            take: 100,
        });
    }
    async updateMessageStatus(productionId, messageId, status) {
        if (status === 'ON_AIR') {
            await this.prisma.socialMessage.updateMany({
                where: { productionId, status: 'ON_AIR' },
                data: { status: 'APPROVED' },
            });
        }
        const message = await this.prisma.socialMessage.update({
            where: { id: messageId },
            data: { status },
        });
        this.eventEmitter.emit('social.message.updated', message);
        if (status === 'ON_AIR') {
            this.eventEmitter.emit('graphics.social.show', message);
            this.eventEmitter.emit('overlay.broadcast_data', {
                productionId,
                data: {
                    latest_comment_author: message.author,
                    latest_comment_content: message.content,
                    latest_comment_platform: message.platform,
                    latest_comment_avatar: message.authorAvatar || '',
                },
            });
        }
        else if (status === 'APPROVED' ||
            status === 'REJECTED' ||
            status === 'PENDING') {
            this.eventEmitter.emit('graphics.social.hide', { productionId });
        }
        return message;
    }
    async createPoll(productionId, question, options) {
        await this.prisma.socialPoll.updateMany({
            where: { productionId, isActive: true },
            data: { isActive: false },
        });
        const pollOptions = options.map((opt, index) => ({
            id: `opt-${index}`,
            text: opt,
            votes: 0,
        }));
        const poll = await this.prisma.socialPoll.create({
            data: {
                productionId,
                question,
                options: pollOptions,
                isActive: true,
            },
        });
        this.eventEmitter.emit('social.poll.created', poll);
        return poll;
    }
    async getActivePoll(productionId) {
        return this.prisma.socialPoll.findFirst({
            where: { productionId, isActive: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async votePoll(pollId, optionId) {
        const poll = await this.prisma.socialPoll.findUnique({
            where: { id: pollId },
        });
        if (!poll || !poll.isActive) {
            throw new common_1.NotFoundException('Poll not found or inactive');
        }
        const options = poll.options;
        const option = options.find((o) => o.id === optionId);
        if (option) {
            option.votes += 1;
            const updatedPoll = await this.prisma.socialPoll.update({
                where: { id: pollId },
                data: { options: options },
            });
            this.eventEmitter.emit('social.poll.updated', updatedPoll);
            return updatedPoll;
        }
        throw new common_1.NotFoundException('Option not found');
    }
    async closePoll(productionId, pollId) {
        const poll = await this.prisma.socialPoll.update({
            where: { id: pollId },
            data: { isActive: false },
        });
        this.eventEmitter.emit('social.poll.closed', poll);
        return poll;
    }
    async getAiHighlights(productionId) {
        const messages = await this.getMessages(productionId, 'APPROVED');
        return this.aiService.suggestSocialHighlights(messages);
    }
};
exports.SocialService = SocialService;
exports.SocialService = SocialService = SocialService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2,
        ai_service_1.AiService])
], SocialService);
//# sourceMappingURL=social.service.js.map