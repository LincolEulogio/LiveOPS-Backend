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
var RehearsalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RehearsalService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
let RehearsalService = RehearsalService_1 = class RehearsalService {
    prisma;
    eventEmitter;
    logger = new common_1.Logger(RehearsalService_1.name);
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async generateMockData() {
        const activeRehearsals = await this.prisma.production.findMany({
            where: {
                isRehearsal: true,
                deletedAt: null,
            },
            select: { id: true },
        });
        for (const prod of activeRehearsals) {
            this.generateMockTelemetry(prod.id);
            this.generateMockSocial(prod.id);
        }
    }
    generateMockTelemetry(productionId) {
        const payload = {
            productionId,
            engineType: 'REHEARSAL',
            cpuUsage: 10 + Math.random() * 5,
            fps: 59 + Math.random() * 2,
            bitrate: 4500 + Math.random() * 1000,
            skippedFrames: 0,
            totalFrames: 1000,
            memoryUsage: 450 + Math.random() * 50,
            isStreaming: true,
            isRecording: false,
            timestamp: new Date().toISOString(),
        };
        this.eventEmitter.emit('production.health.stats', payload);
    }
    generateMockSocial(productionId) {
        if (Math.random() > 0.7) {
            const users = ['AlexLive', 'StreamFan_99', 'TechPro', 'LiveMaster', 'CommunityManager'];
            const comments = [
                '¡Increíble la calidad del stream!',
                '¿Cómo haces ese efecto de transición?',
                'Saludos desde España 🇪🇸',
                '¿Qué cámara estás usando?',
                '¡Sigue así, muy buen contenido!',
                'Hola a todos en el chat',
            ];
            const payload = {
                productionId,
                platform: 'REHEARSAL',
                user: users[Math.floor(Math.random() * users.length)],
                message: comments[Math.floor(Math.random() * comments.length)],
                timestamp: new Date().toISOString(),
            };
            this.eventEmitter.emit('social.comment.received', payload);
        }
    }
};
exports.RehearsalService = RehearsalService;
__decorate([
    (0, schedule_1.Interval)(5000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RehearsalService.prototype, "generateMockData", null);
exports.RehearsalService = RehearsalService = RehearsalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], RehearsalService);
//# sourceMappingURL=rehearsal.service.js.map