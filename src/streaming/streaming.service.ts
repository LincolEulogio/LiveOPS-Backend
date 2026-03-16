import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ObsService } from '@/obs/obs.service';
import { VmixService } from '@/vmix/vmix.service';
import { StreamingCommandDto } from '@/streaming/dto/streaming-command.dto';
import { IVideoEngine, ISceneEngine, IInputEngine } from './interfaces/video-engine.interface';

@Injectable()
export class StreamingService {
  constructor(
    private prisma: PrismaService,
    private obsService: ObsService,
    private vmixService: VmixService,
  ) {}

  private getEngine(production: any): IVideoEngine {
    if (production.engineType === 'OBS') return this.obsService;
    if (production.engineType === 'VMIX') return this.vmixService;
    throw new BadRequestException('Unsupported engine type');
  }

  async getStreamingState(productionId: string) {
    const production = await this.prisma.production.findUnique({
      where: { id: productionId },
    });

    if (!production) throw new NotFoundException('Production not found');

    const engine = this.getEngine(production);
    const state = await engine.getRealTimeState(productionId);

    return {
      productionId,
      engineType: production.engineType,
      status: production.status,
      isConnected: state.isConnected,
      obs: production.engineType === 'OBS' ? state : null,
      vmix: production.engineType === 'VMIX' ? state : null,
      lastUpdate: new Date().toISOString(),
    };
  }

  async handleCommand(productionId: string, dto: StreamingCommandDto) {
    const production = await this.prisma.production.findUnique({
      where: { id: productionId },
    });

    if (!production) throw new NotFoundException('Production not found');

    const engine = this.getEngine(production);

    switch (dto.type) {
      case 'CHANGE_SCENE': {
        if (!dto.sceneName) throw new BadRequestException('sceneName is required');
        if ('changeScene' in engine) {
          return (engine as unknown as ISceneEngine).changeScene(productionId, dto.sceneName);
        }
        throw new BadRequestException('CHANGE_SCENE not supported by this engine');
      }
      case 'START_STREAM':
        return engine.startStream(productionId);
      case 'STOP_STREAM':
        return engine.stopStream(productionId);
      case 'START_RECORD':
        return engine.startRecord(productionId);
      case 'STOP_RECORD':
        return engine.stopRecord(productionId);
      case 'VMIX_CUT':
        if ('cut' in engine) return (engine as unknown as IInputEngine).cut(productionId);
        throw new BadRequestException('CUT not supported by this engine');
      case 'VMIX_FADE':
        if ('fade' in engine) return (engine as unknown as IInputEngine).fade!(productionId);
        throw new BadRequestException('FADE not supported by this engine');
      case 'VMIX_SELECT_INPUT': {
        const payload = dto.payload as Record<string, any>;
        if (!payload?.input) throw new BadRequestException('input is required in payload');
        if ('changeInput' in engine) {
          return (engine as unknown as IInputEngine).changeInput(productionId, payload.input as number);
        }
        throw new BadRequestException('SELECT_INPUT not supported by this engine');
      }
      case 'START_DESTINATION':
      case 'STOP_DESTINATION': {
        const payload = dto.payload as Record<string, any>;
        if (!payload?.destId) throw new BadRequestException('destId is required');
        return { success: true, destId: payload.destId };
      }
      default:
        throw new BadRequestException(`Unknown command: ${dto.type}`);
    }
  }
}
