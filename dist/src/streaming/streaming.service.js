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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const obs_service_1 = require("../obs/obs.service");
const vmix_service_1 = require("../vmix/vmix.service");
let StreamingService = class StreamingService {
    prisma;
    obsService;
    vmixService;
    constructor(prisma, obsService, vmixService) {
        this.prisma = prisma;
        this.obsService = obsService;
        this.vmixService = vmixService;
    }
    async getStreamingState(productionId) {
        const production = await this.prisma.production.findUnique({
            where: { id: productionId },
        });
        if (!production)
            throw new common_1.NotFoundException('Production not found');
        return {
            productionId,
            engineType: production.engineType,
            status: production.status,
            lastUpdate: new Date().toISOString(),
        };
    }
    async handleCommand(productionId, dto) {
        const production = await this.prisma.production.findUnique({
            where: { id: productionId },
        });
        if (!production)
            throw new common_1.NotFoundException('Production not found');
        if (production.engineType === 'OBS') {
            return this.handleObsCommand(productionId, dto);
        }
        else if (production.engineType === 'VMIX') {
            return this.handleVmixCommand(productionId, dto);
        }
        else {
            throw new common_1.BadRequestException('Unsupported engine type');
        }
    }
    async handleObsCommand(productionId, dto) {
        switch (dto.type) {
            case 'CHANGE_SCENE':
                if (!dto.sceneName)
                    throw new common_1.BadRequestException('sceneName is required');
                return this.obsService.changeScene(productionId, { sceneName: dto.sceneName });
            case 'START_STREAM':
                return this.obsService.startStream(productionId);
            case 'STOP_STREAM':
                return this.obsService.stopStream(productionId);
            default:
                throw new common_1.BadRequestException(`Unknown OBS command: ${dto.type}`);
        }
    }
    async handleVmixCommand(productionId, dto) {
        switch (dto.type) {
            case 'VMIX_CUT':
                return this.vmixService.cut(productionId);
            case 'VMIX_FADE':
                return this.vmixService.fade(productionId);
            case 'VMIX_SELECT_INPUT':
                if (!dto.payload?.input)
                    throw new common_1.BadRequestException('input is required in payload');
                return this.vmixService.changeInput(productionId, { input: dto.payload.input });
            default:
                throw new common_1.BadRequestException(`Unknown vMix command: ${dto.type}`);
        }
    }
};
exports.StreamingService = StreamingService;
exports.StreamingService = StreamingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        obs_service_1.ObsService,
        vmix_service_1.VmixService])
], StreamingService);
//# sourceMappingURL=streaming.service.js.map