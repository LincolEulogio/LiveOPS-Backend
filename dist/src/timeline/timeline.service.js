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
var TimelineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
let TimelineService = TimelineService_1 = class TimelineService {
    prisma;
    eventEmitter;
    logger = new common_1.Logger(TimelineService_1.name);
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async getBlocks(productionId) {
        return this.prisma.timelineBlock.findMany({
            where: { productionId },
            orderBy: { order: 'asc' },
            include: { intercomTemplate: true },
        });
    }
    async createBlock(productionId, dto) {
        const block = await this.prisma.timelineBlock.create({
            data: {
                productionId,
                ...dto,
            },
        });
        this.emitTimelineUpdated(productionId);
        return block;
    }
    async updateBlock(id, productionId, dto) {
        const block = await this.prisma.timelineBlock.findFirst({
            where: { id, productionId },
        });
        if (!block)
            throw new common_1.NotFoundException('Block not found');
        const updated = await this.prisma.timelineBlock.update({
            where: { id },
            data: dto,
        });
        this.emitTimelineUpdated(productionId);
        return updated;
    }
    async deleteBlock(id, productionId) {
        const block = await this.prisma.timelineBlock.findFirst({
            where: { id, productionId },
        });
        if (!block)
            throw new common_1.NotFoundException('Block not found');
        await this.prisma.timelineBlock.delete({ where: { id } });
        this.emitTimelineUpdated(productionId);
        return { success: true };
    }
    async reorderBlocks(productionId, blockIds) {
        await this.prisma.$transaction(blockIds.map((id, index) => this.prisma.timelineBlock.update({
            where: { id },
            data: { order: index },
        })));
        this.emitTimelineUpdated(productionId);
        return { success: true };
    }
    async startBlock(id, productionId) {
        const block = await this.prisma.timelineBlock.findFirst({
            where: { id, productionId },
            include: { intercomTemplate: true },
        });
        if (!block)
            throw new common_1.NotFoundException('Block not found');
        if (block.status === 'ACTIVE')
            throw new common_1.BadRequestException('Block is already active');
        await this.prisma.timelineBlock.updateMany({
            where: { productionId, status: 'ACTIVE' },
            data: { status: 'COMPLETED', endTime: new Date() },
        });
        const updated = await this.prisma.timelineBlock.update({
            where: { id },
            data: {
                status: 'ACTIVE',
                startTime: new Date(),
                endTime: null,
            },
        });
        this.eventEmitter.emit('timeline.block.started', {
            productionId,
            blockId: block.id,
            linkedScene: block.linkedScene,
        });
        this.eventEmitter.emit('overlay.broadcast_data', {
            productionId,
            data: {
                active_block_title: updated.title,
                active_block_notes: updated.notes || '',
                active_block_guest: (updated.notes?.match(/Guest:\s*([^|]*)/) || [])[1]?.trim() || '',
                active_block_duration: updated.durationMs ? `${Math.floor(updated.durationMs / 1000)}s` : '',
            }
        });
        this.emitTimelineUpdated(productionId);
        return updated;
    }
    async completeBlock(id, productionId) {
        const block = await this.prisma.timelineBlock.findFirst({
            where: { id, productionId },
        });
        if (!block)
            throw new common_1.NotFoundException('Block not found');
        const updated = await this.prisma.timelineBlock.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                endTime: new Date(),
            },
        });
        this.emitTimelineUpdated(productionId);
        return updated;
    }
    async resetBlock(id, productionId) {
        const block = await this.prisma.timelineBlock.findFirst({
            where: { id, productionId },
        });
        if (!block)
            throw new common_1.NotFoundException('Block not found');
        const updated = await this.prisma.timelineBlock.update({
            where: { id },
            data: {
                status: 'PENDING',
                startTime: null,
                endTime: null,
            },
        });
        this.emitTimelineUpdated(productionId);
        return updated;
    }
    emitTimelineUpdated(productionId) {
        this.eventEmitter.emit('timeline.updated', { productionId });
    }
};
exports.TimelineService = TimelineService;
exports.TimelineService = TimelineService = TimelineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], TimelineService);
//# sourceMappingURL=timeline.service.js.map