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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const prisma_service_1 = require("../prisma/prisma.service");
let PublicAnalyticsController = class PublicAnalyticsController {
    analyticsService;
    prisma;
    constructor(analyticsService, prisma) {
        this.analyticsService = analyticsService;
        this.prisma = prisma;
    }
    async getPublicStatus(id) {
        const production = await this.prisma.production.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                publicStatusEnabled: true,
                status: true,
                engineType: true,
                timelineBlocks: {
                    where: { status: 'ACTIVE' },
                    take: 1,
                },
            },
        });
        if (!production) {
            throw new common_1.NotFoundException('Production not found');
        }
        if (!production.publicStatusEnabled) {
            throw new common_1.ForbiddenException('Public status page is disabled for this production');
        }
        const telemetry = await this.analyticsService.getTelemetryLogs(id, 5);
        return {
            productionName: production.name,
            status: production.status,
            engineType: production.engineType,
            activeSegment: production.timelineBlocks[0]?.title || 'Intermission',
            telemetry: telemetry.slice(-10),
        };
    }
};
exports.PublicAnalyticsController = PublicAnalyticsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicAnalyticsController.prototype, "getPublicStatus", null);
exports.PublicAnalyticsController = PublicAnalyticsController = __decorate([
    (0, common_1.Controller)('public/productions/:id/status'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService,
        prisma_service_1.PrismaService])
], PublicAnalyticsController);
//# sourceMappingURL=public-analytics.controller.js.map