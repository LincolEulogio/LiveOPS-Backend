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
let VmixService = VmixService_1 = class VmixService {
    prisma;
    vmixManager;
    logger = new common_1.Logger(VmixService_1.name);
    constructor(prisma, vmixManager) {
        this.prisma = prisma;
        this.vmixManager = vmixManager;
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
    async changeInput(productionId, dto) {
        try {
            await this.vmixManager.sendCommand(productionId, 'Cut', {
                Input: dto.input,
            });
            return { success: true, input: dto.input, action: 'cut' };
        }
        catch (e) {
            this.logger.error(`Failed to change input: ${e.message}`);
            throw new common_1.BadRequestException(`vMix Error: ${e.message || 'Unknown'}`);
        }
    }
    async cut(productionId) {
        try {
            await this.vmixManager.sendCommand(productionId, 'Cut');
            return { success: true, action: 'cut' };
        }
        catch (e) {
            this.logger.error(`Failed to trigger cut: ${e.message}`);
            throw new common_1.BadRequestException(`vMix Error: ${e.message || 'Unknown'}`);
        }
    }
    async fade(productionId, dto) {
        try {
            const params = dto?.duration ? { Duration: dto.duration } : undefined;
            await this.vmixManager.sendCommand(productionId, 'Fade', params);
            return { success: true, action: 'fade', duration: dto?.duration };
        }
        catch (e) {
            this.logger.error(`Failed to trigger fade: ${e.message}`);
            throw new common_1.BadRequestException(`vMix Error: ${e.message || 'Unknown'}`);
        }
    }
};
exports.VmixService = VmixService;
exports.VmixService = VmixService = VmixService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        vmix_connection_manager_1.VmixConnectionManager])
], VmixService);
//# sourceMappingURL=vmix.service.js.map