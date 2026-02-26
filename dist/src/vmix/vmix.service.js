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
var VmixService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VmixService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const vmix_connection_manager_1 = require("./vmix-connection.manager");
const audit_service_1 = require("../common/services/audit.service");
let VmixService = VmixService_1 = class VmixService {
    prisma;
    vmixManager;
    auditService;
    logger = new common_1.Logger(VmixService_1.name);
    constructor(prisma, vmixManager, auditService) {
        this.prisma = prisma;
        this.vmixManager = vmixManager;
        this.auditService = auditService;
    }
    async saveConnection(productionId, dto) {
        const connection = await this.prisma.vmixConnection.upsert({
            where: { productionId },
            update: {
                url: dto.url,
                isEnabled: dto.isEnabled ?? true,
                pollingInterval: dto.pollingInterval ?? 500,
            },
            create: {
                productionId,
                url: dto.url,
                isEnabled: dto.isEnabled ?? true,
                pollingInterval: dto.pollingInterval ?? 500,
            },
        });
        if (connection.isEnabled) {
            this.vmixManager.connectVmix(productionId, connection.url, connection.pollingInterval);
        }
        else {
            this.vmixManager.stopPolling(productionId);
        }
        return connection;
    }
    async getConnection(productionId) {
        const conn = await this.prisma.vmixConnection.findUnique({
            where: { productionId },
        });
        if (!conn)
            throw new common_1.NotFoundException('vMix Connection not configured for this production');
        return conn;
    }
    isConnected(productionId) {
        return this.vmixManager.isConnected(productionId);
    }
    async getRealTimeState(productionId) {
        return this.vmixManager.getVmixState(productionId);
    }
    async changeInput(productionId, dto) {
        try {
            await this.vmixManager.sendCommand(productionId, 'PreviewInput', {
                Input: dto.input,
            });
            this.auditService.log({
                productionId,
                action: audit_service_1.AuditAction.SCENE_CHANGE,
                details: { engine: 'vmix', input: dto.input, target: 'preview' }
            });
            return { success: true, input: dto.input, action: 'preview' };
        }
        catch (e) {
            const error = e;
            this.logger.error(`Failed to change input: ${error.message}`);
            throw new common_1.BadRequestException(`vMix Error: ${error.message || 'Unknown'}`);
        }
    }
    async cut(productionId) {
        try {
            await this.vmixManager.sendCommand(productionId, 'Cut');
            this.auditService.log({
                productionId,
                action: audit_service_1.AuditAction.SCENE_CHANGE,
                details: { engine: 'vmix', action: 'cut', target: 'program' }
            });
            return { success: true, action: 'cut' };
        }
        catch (e) {
            const error = e;
            this.logger.error(`Failed to trigger cut: ${error.message}`);
            throw new common_1.BadRequestException(`vMix Error: ${error.message || 'Unknown'}`);
        }
    }
    async fade(productionId, dto) {
        try {
            const params = dto?.duration ? { Duration: dto.duration } : undefined;
            await this.vmixManager.sendCommand(productionId, 'Fade', params);
            this.auditService.log({
                productionId,
                action: audit_service_1.AuditAction.SCENE_CHANGE,
                details: { engine: 'vmix', action: 'fade', duration: dto?.duration, target: 'program' }
            });
            return { success: true, action: 'fade', duration: dto?.duration };
        }
        catch (e) {
            const error = e;
            this.logger.error(`Failed to trigger fade: ${error.message}`);
            throw new common_1.BadRequestException(`vMix Error: ${error.message || 'Unknown'}`);
        }
    }
    async saveVideoDelay(productionId) {
        try {
            await this.vmixManager.sendCommand(productionId, 'VideoDelaySave', {
                Input: -1,
            });
            return { success: true, action: 'videoDelaySave' };
        }
        catch (e) {
            const error = e;
            this.logger.error(`Failed to save video delay: ${error.message}`);
            throw new common_1.BadRequestException(`vMix Error: ${error.message || 'Unknown'}`);
        }
    }
};
exports.VmixService = VmixService;
exports.VmixService = VmixService = VmixService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        vmix_connection_manager_1.VmixConnectionManager,
        audit_service_1.AuditService])
], VmixService);
//# sourceMappingURL=vmix.service.js.map