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
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleEvent(eventPrefix, payload) {
        if (eventPrefix === 'obs.connection.state' && payload?.connected === true)
            return;
        const productionId = payload?.productionId;
        if (!productionId)
            return;
        try {
            await this.prisma.productionLog.create({
                data: {
                    productionId,
                    eventType: eventPrefix,
                    details: payload
                }
            });
        }
        catch (error) {
            this.logger.error(`Failed to log event ${eventPrefix}: ${error.message}`);
        }
    }
    async handleOperatorActivity(eventPrefix, payload) {
        const productionId = payload?.productionId || payload?.productionId;
        const userId = payload?.userId;
        if (!productionId || !userId)
            return;
        try {
            await this.prisma.operatorActivity.create({
                data: {
                    productionId,
                    userId,
                    action: eventPrefix,
                    details: payload
                }
            });
        }
        catch (error) {
            this.logger.error(`Failed to log operator activity ${eventPrefix}: ${error.message}`);
        }
    }
    async getDashboardMetrics(productionId) {
        const totalLogs = await this.prisma.productionLog.count({ where: { productionId } });
        const eventCounts = await this.prisma.productionLog.groupBy({
            by: ['eventType'],
            where: { productionId },
            _count: true
        });
        const operatorActions = await this.prisma.operatorActivity.count({ where: { productionId } });
        return {
            productionId,
            totalEvents: totalLogs,
            breakdown: eventCounts,
            totalOperatorActions: operatorActions
        };
    }
    async getProductionLogs(productionId) {
        return this.prisma.productionLog.findMany({
            where: { productionId },
            orderBy: { createdAt: 'desc' },
            take: 500
        });
    }
    async getAllLogsForExport(productionId) {
        return this.prisma.productionLog.findMany({
            where: { productionId },
            orderBy: { createdAt: 'asc' }
        });
    }
};
exports.AnalyticsService = AnalyticsService;
__decorate([
    (0, event_emitter_1.OnEvent)('**'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsService.prototype, "handleEvent", null);
__decorate([
    (0, event_emitter_1.OnEvent)('command.send'),
    (0, event_emitter_1.OnEvent)('command.ack'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsService.prototype, "handleOperatorActivity", null);
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map