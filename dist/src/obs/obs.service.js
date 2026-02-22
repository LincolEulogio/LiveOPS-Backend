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
var ObsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const obs_connection_manager_1 = require("./obs-connection.manager");
let ObsService = ObsService_1 = class ObsService {
    prisma;
    obsManager;
    logger = new common_1.Logger(ObsService_1.name);
    constructor(prisma, obsManager) {
        this.prisma = prisma;
        this.obsManager = obsManager;
    }
    async saveConnection(productionId, dto) {
        const connection = await this.prisma.obsConnection.upsert({
            where: { productionId },
            update: {
                url: dto.url,
                password: dto.password,
                isEnabled: dto.isEnabled ?? true,
            },
            create: {
                productionId,
                url: dto.url,
                password: dto.password,
                isEnabled: dto.isEnabled ?? true,
            },
        });
        if (connection.isEnabled) {
            this.obsManager.connectObs(productionId, connection.url, connection.password || undefined);
        }
        else {
            this.obsManager.disconnectObs(productionId);
        }
        return connection;
    }
    async getConnection(productionId) {
        const conn = await this.prisma.obsConnection.findUnique({
            where: { productionId },
        });
        if (!conn)
            throw new common_1.NotFoundException('OBS Connection not configured for this production');
        return conn;
    }
    isConnected(productionId) {
        return this.obsManager.getObsState(productionId).isConnected;
    }
    async getRealTimeState(productionId) {
        return this.obsManager.getObsState(productionId);
    }
    getObs(productionId) {
        const obs = this.obsManager.getInstance(productionId);
        if (!obs) {
            throw new common_1.BadRequestException('OBS is not connected or configured for this production');
        }
        return obs;
    }
    async changeScene(productionId, dto) {
        const obs = this.getObs(productionId);
        try {
            await obs.call('SetCurrentProgramScene', { sceneName: dto.sceneName });
            return { success: true, sceneName: dto.sceneName };
        }
        catch (e) {
            this.logger.error(`Failed to change scene: ${e.message}`);
            throw new common_1.BadRequestException(`OBS Error: ${e.message || 'Unknown'}`);
        }
    }
    async startStream(productionId) {
        const obs = this.getObs(productionId);
        try {
            await obs.call('StartStream');
            return { success: true };
        }
        catch (e) {
            this.logger.error(`Failed to start stream: ${e.message}`);
            throw new common_1.BadRequestException(`OBS Error: ${e.message || 'Unknown'}`);
        }
    }
    async stopStream(productionId) {
        const obs = this.getObs(productionId);
        try {
            await obs.call('StopStream');
            return { success: true };
        }
        catch (e) {
            this.logger.error(`Failed to stop stream: ${e.message}`);
            throw new common_1.BadRequestException(`OBS Error: ${e.message || 'Unknown'}`);
        }
    }
    async startRecord(productionId) {
        const obs = this.getObs(productionId);
        try {
            await obs.call('StartRecord');
            return { success: true };
        }
        catch (e) {
            this.logger.error(`Failed to start record: ${e.message}`);
            throw new common_1.BadRequestException(`OBS Error: ${e.message || 'Unknown'}`);
        }
    }
    async stopRecord(productionId) {
        const obs = this.getObs(productionId);
        try {
            await obs.call('StopRecord');
            return { success: true };
        }
        catch (e) {
            this.logger.error(`Failed to stop record: ${e.message}`);
            throw new common_1.BadRequestException(`OBS Error: ${e.message || 'Unknown'}`);
        }
    }
};
exports.ObsService = ObsService;
exports.ObsService = ObsService = ObsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        obs_connection_manager_1.ObsConnectionManager])
], ObsService);
//# sourceMappingURL=obs.service.js.map