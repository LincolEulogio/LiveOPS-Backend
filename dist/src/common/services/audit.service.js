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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = exports.AuditAction = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
var AuditAction;
(function (AuditAction) {
    AuditAction["INTERCOM_SEND"] = "INTERCOM_SEND";
    AuditAction["STREAM_START"] = "STREAM_START";
    AuditAction["STREAM_STOP"] = "STREAM_STOP";
    AuditAction["RECORD_START"] = "RECORD_START";
    AuditAction["RECORD_STOP"] = "RECORD_STOP";
    AuditAction["SCENE_CHANGE"] = "SCENE_CHANGE";
    AuditAction["AUTOMATION_TRIGGER"] = "AUTOMATION_TRIGGER";
    AuditAction["INSTANT_CLIP"] = "INSTANT_CLIP";
    AuditAction["USER_LOGIN"] = "USER_LOGIN";
    AuditAction["SYSTEM_ALERT"] = "SYSTEM_ALERT";
    AuditAction["TIMELINE_START"] = "TIMELINE_START";
    AuditAction["TIMELINE_COMPLETE"] = "TIMELINE_COMPLETE";
    AuditAction["TIMELINE_RESET"] = "TIMELINE_RESET";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
let AuditService = AuditService_1 = class AuditService {
    prisma;
    logger = new common_1.Logger(AuditService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(payload) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: payload.userId,
                    action: payload.action,
                    details: payload.details,
                    ipAddress: payload.ipAddress,
                },
            });
            if (payload.productionId) {
                await this.prisma.productionLog.create({
                    data: {
                        productionId: payload.productionId,
                        eventType: payload.action,
                        details: payload.details,
                    },
                });
            }
            this.logger.debug(`Audit log created: ${payload.action} for production ${payload.productionId || 'GLOBAL'}`);
        }
        catch (error) {
            this.logger.error(`Failed to create audit log: ${error.message}`);
        }
    }
    async getLogs(productionId, limit = 100, page = 1) {
        const skip = (page - 1) * limit;
        if (productionId) {
            return this.prisma.productionLog.findMany({
                where: { productionId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            });
        }
        return this.prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true, email: true } } },
            take: limit,
            skip,
        });
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map