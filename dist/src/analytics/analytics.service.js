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
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    prisma;
    logger = new common_1.Logger(AnalyticsService_1.name);
    lastWriteTime = new Map();
    WRITE_INTERVAL_MS = 5000;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleProductionHealthStats(payload) {
        try {
            const now = Date.now();
            const lastWrite = this.lastWriteTime.get(payload.productionId) || 0;
            if (now - lastWrite < this.WRITE_INTERVAL_MS) {
                return;
            }
            this.lastWriteTime.set(payload.productionId, now);
            await this.prisma.telemetryLog.create({
                data: {
                    productionId: payload.productionId,
                    cpuUsage: payload.stats.cpuUsage,
                    memoryUsage: payload.stats.memoryUsage,
                    fps: payload.stats.fps,
                    bitrate: payload.stats.bitrate || 0,
                    droppedFrames: payload.stats.droppedFrames,
                    isStreaming: payload.stats.isStreaming || false,
                    isRecording: payload.stats.isRecording || false,
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to save telemetry for production ${payload.productionId}:`, error);
        }
    }
    async getTelemetryLogs(productionId, minutes = 60) {
        const since = new Date(Date.now() - minutes * 60 * 1000);
        return this.prisma.telemetryLog.findMany({
            where: {
                productionId,
                timestamp: { gte: since },
            },
            orderBy: { timestamp: 'asc' }
        });
    }
    async generateShowReport(productionId) {
        try {
            const existing = await this.prisma.showReport.findUnique({
                where: { productionId }
            });
            if (existing)
                return existing;
            const telemetry = await this.prisma.telemetryLog.findMany({
                where: { productionId },
                orderBy: { timestamp: 'asc' }
            });
            const timelineBlocks = await this.prisma.timelineBlock.findMany({
                where: { productionId },
                orderBy: { order: 'asc' }
            });
            const streamingLogs = telemetry.filter(t => t.isStreaming);
            let startTime = streamingLogs.length > 0 ? streamingLogs[0].timestamp : undefined;
            let endTime = streamingLogs.length > 0 ? streamingLogs[streamingLogs.length - 1].timestamp : undefined;
            let durationMs = 0;
            if (startTime && endTime) {
                durationMs = endTime.getTime() - startTime.getTime();
            }
            else {
                const firstBlock = timelineBlocks.find(b => b.startTime);
                const lastBlock = timelineBlocks.reverse().find(b => b.endTime);
                if (firstBlock?.startTime && lastBlock?.endTime) {
                    startTime = firstBlock.startTime;
                    endTime = lastBlock.endTime;
                    durationMs = endTime.getTime() - startTime.getTime();
                }
            }
            const totalDroppedFrames = telemetry.reduce((sum, log) => sum + (log.droppedFrames || 0), 0);
            const maxCpu = Math.max(...telemetry.map(t => t.cpuUsage || 0), 0);
            const avgFps = telemetry.length ? telemetry.reduce((sum, log) => sum + (log.fps || 0), 0) / telemetry.length : 0;
            const report = await this.prisma.showReport.create({
                data: {
                    productionId,
                    startTime,
                    endTime,
                    durationMs,
                    alertsCount: 0,
                    peakViewers: 0,
                    metrics: {
                        totalDroppedFrames,
                        maxCpu,
                        avgFps,
                        samples: telemetry.length
                    }
                }
            });
            return report;
        }
        catch (e) {
            this.logger.error(`Error generating show report for ${productionId}`, e);
            throw e;
        }
    }
    async getShowReport(productionId) {
        return this.prisma.showReport.findUnique({
            where: { productionId }
        });
    }
};
exports.AnalyticsService = AnalyticsService;
__decorate([
    (0, event_emitter_1.OnEvent)('production.health.stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsService.prototype, "handleProductionHealthStats", null);
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map