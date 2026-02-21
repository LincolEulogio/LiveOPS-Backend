import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObsService } from '../obs/obs.service';
import { VmixService } from '../vmix/vmix.service';
import { StreamingCommandDto } from './dto/streaming-command.dto';

@Injectable()
export class StreamingService {
    constructor(
        private prisma: PrismaService,
        private obsService: ObsService,
        private vmixService: VmixService,
    ) { }

    async getStreamingState(productionId: string) {
        const production = await this.prisma.production.findUnique({
            where: { id: productionId },
        });

        if (!production) throw new NotFoundException('Production not found');

        let isConnected = false;
        let obsState = null;
        let vmixState = null;

        if (production.engineType === 'OBS') {
            obsState = await this.obsService.getRealTimeState(productionId);
            isConnected = obsState.isConnected;
        } else if (production.engineType === 'VMIX') {
            isConnected = this.vmixService.isConnected(productionId);
            // vMix polling automatically updates the store via events, 
            // but for initial load we might want to return last known if we had a cache.
            // For now just returning connectivity.
        }

        return {
            productionId,
            engineType: production.engineType,
            status: production.status,
            isConnected,
            obs: obsState,
            vmix: vmixState,
            lastUpdate: new Date().toISOString(),
        };
    }

    async handleCommand(productionId: string, dto: StreamingCommandDto) {
        const production = await this.prisma.production.findUnique({
            where: { id: productionId },
        });

        if (!production) throw new NotFoundException('Production not found');

        if (production.engineType === 'OBS') {
            return this.handleObsCommand(productionId, dto);
        } else if (production.engineType === 'VMIX') {
            return this.handleVmixCommand(productionId, dto);
        } else {
            throw new BadRequestException('Unsupported engine type');
        }
    }

    private async handleObsCommand(productionId: string, dto: StreamingCommandDto) {
        switch (dto.type) {
            case 'CHANGE_SCENE':
                if (!dto.sceneName) throw new BadRequestException('sceneName is required');
                return this.obsService.changeScene(productionId, { sceneName: dto.sceneName });
            case 'START_STREAM':
                return this.obsService.startStream(productionId);
            case 'STOP_STREAM':
                return this.obsService.stopStream(productionId);
            case 'START_RECORD':
                return this.obsService.startRecord(productionId);
            case 'STOP_RECORD':
                return this.obsService.stopRecord(productionId);
            default:
                throw new BadRequestException(`Unknown OBS command: ${dto.type}`);
        }
    }

    private async handleVmixCommand(productionId: string, dto: StreamingCommandDto) {
        switch (dto.type) {
            case 'VMIX_CUT':
                return this.vmixService.cut(productionId);
            case 'VMIX_FADE':
                return this.vmixService.fade(productionId);
            case 'VMIX_SELECT_INPUT':
                if (!dto.payload?.input) throw new BadRequestException('input is required in payload');
                return this.vmixService.changeInput(productionId, { input: dto.payload.input });
            default:
                throw new BadRequestException(`Unknown vMix command: ${dto.type}`);
        }
    }
}
