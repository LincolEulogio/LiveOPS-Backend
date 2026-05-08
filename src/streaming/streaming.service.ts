import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ObsService } from '@/obs/obs.service';
import { VmixService } from '@/vmix/vmix.service';
import { LiveKitService } from './livekit.service';
import { StreamingCommandDto } from '@/streaming/dto/streaming-command.dto';
import { getErrorMessage } from '@/common/utils/error.util';
import {
  IVideoEngine,
  ISceneEngine,
} from './interfaces/video-engine.interface';
import { Production, StreamingDestination } from '@prisma/client';

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);

  constructor(
    private prisma: PrismaService,
    private obsService: ObsService,
    private vmixService: VmixService,
    private liveKitService: LiveKitService,
  ) {}

  private getEngine(production: Production): IVideoEngine {
    if (production.engineType === 'OBS') return this.obsService;
    if (production.engineType === 'VMIX') return this.vmixService;
    throw new BadRequestException('Unsupported engine type');
  }

  async getStreamingState(productionId: string) {
    const production = await this.prisma.production.findUnique({
      where: { id: productionId },
    });

    if (!production) {
      throw new NotFoundException('Production not found');
    }

    const engine = this.getEngine(production);
    const state = await engine.getRealTimeState(productionId);

    return {
      productionId,
      engineType: production.engineType,
      status: production.status,
      isConnected: state.isConnected,
      activeEgressId: production.activeEgressId || null,
      obs: production.engineType === 'OBS' ? state : null,
      vmix: production.engineType === 'VMIX' ? state : null,
      lastUpdate: new Date().toISOString(),
    };
  }

  async startCloudStream(productionId: string, layout?: string) {
    const production = await this.prisma.production.findUnique({
      where: { id: productionId },
      include: { streamingDestinations: true },
    });

    if (!production) {
      throw new NotFoundException('Production not found');
    }

    if (production.activeEgressId) {
      throw new BadRequestException('Cloud stream already active');
    }

    const enabledDestinations = production.streamingDestinations.filter(
      (d: StreamingDestination) => d.isEnabled,
    );
    if (enabledDestinations.length === 0) {
      throw new BadRequestException('No enabled streaming destinations found');
    }

    const rtmpUrls = enabledDestinations.map(
      (d: StreamingDestination) => `${d.rtmpUrl}${d.streamKey}`,
    );

    try {
      const roomName = `production_${productionId}`;

      // Ensure that the room exists before trying to start an egress
      await this.liveKitService.ensureRoomExists(roomName);

      const egressInfo = await this.liveKitService.startRoomCompositeEgress(
        roomName,
        rtmpUrls,
        layout,
      );

      await this.prisma.production.update({
        where: { id: productionId },
        data: { activeEgressId: egressInfo.egressId },
      });

      this.logger.log(
        `Cloud stream started for production ${productionId} with egressId ${egressInfo.egressId}`,
      );
      return { success: true, egressId: egressInfo.egressId };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(`Failed to start cloud stream: ${message}`);
      throw new BadRequestException(`Failed to start cloud stream: ${message}`);
    }
  }

  async stopCloudStream(productionId: string) {
    const production = await this.prisma.production.findUnique({
      where: { id: productionId },
    });

    if (!production) {
      throw new NotFoundException('Production not found');
    }

    if (!production.activeEgressId) {
      throw new BadRequestException('No active cloud stream found');
    }

    try {
      if (production.activeEgressId) {
        await this.liveKitService.stopEgress(production.activeEgressId);
      }

      await this.prisma.production.update({
        where: { id: productionId },
        data: { activeEgressId: null },
      });

      this.logger.log(`Cloud stream stopped for production ${productionId}`);
      return { success: true };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(`Failed to stop cloud stream: ${message}`);
      // Even if LiveKit fails to stop it (e.g. already stopped), we reset our local state
      await this.prisma.production.update({
        where: { id: productionId },
        data: { activeEgressId: null },
      });
      return {
        success: true,
        warning: 'Local state reset but LiveKit reported error',
      };
    }
  }

  async handleCommand(productionId: string, dto: StreamingCommandDto) {
    const production = await this.prisma.production.findUnique({
      where: { id: productionId },
    });
    if (!production) throw new NotFoundException('Production not found');

    const engine = this.getEngine(production);
    const p = dto.payload as Record<string, any>;

    type CommandHandler = () => Promise<unknown> | unknown;
    const commands: Partial<Record<string, CommandHandler>> = {
      CHANGE_SCENE:      () => this.handleChangeScene(engine, productionId, dto.sceneName),
      START_STREAM:      () => engine.startStream(productionId),
      STOP_STREAM:       () => engine.stopStream(productionId),
      START_CLOUD_STREAM:() => this.startCloudStream(productionId, p?.layout as string),
      STOP_CLOUD_STREAM: () => this.stopCloudStream(productionId),
      START_RECORD:      () => engine.startRecord(productionId),
      STOP_RECORD:       () => engine.stopRecord(productionId),
      VMIX_CUT:          () => this.executeEngineMethod(engine, 'cut', productionId),
      VMIX_FADE:         () => this.executeEngineMethod(engine, 'fade', productionId),
      VMIX_SELECT_INPUT: () => this.executeEngineMethod(engine, 'changeInput', productionId, p?.input as number),
      VMIX_SET_VOLUME:   () => this.executeEngineMethod(engine, 'setVolume', productionId, p?.input, p?.value),
      VMIX_TOGGLE_MUTE:  () => this.executeEngineMethod(engine, 'toggleMute', productionId, p?.input),
      VMIX_TOGGLE_SOLO:  () => this.executeEngineMethod(engine, 'toggleSolo', productionId, p?.input),
      VMIX_SET_GAIN:     () => this.executeEngineMethod(engine, 'setGain', productionId, p?.input, p?.value),
      VMIX_TOGGLE_BUS:   () => this.executeEngineMethod(engine, 'toggleBus', productionId, p?.input, p?.bus),
      START_DESTINATION: () => ({ success: true, destId: p?.destId as string }),
      STOP_DESTINATION:  () => ({ success: true, destId: p?.destId as string }),
    };

    const handler = commands[dto.type];
    if (!handler) throw new BadRequestException(`Unknown command: ${dto.type}`);
    return handler();
  }

  private async handleChangeScene(
    engine: IVideoEngine,
    productionId: string,
    sceneName?: string,
  ) {
    if (!sceneName) {
      throw new BadRequestException('sceneName is required');
    }
    if ('changeScene' in engine) {
      return (engine as unknown as ISceneEngine).changeScene(
        productionId,
        sceneName,
      );
    }
    throw new BadRequestException('CHANGE_SCENE not supported by this engine');
  }

  private async executeEngineMethod(
    engine: IVideoEngine,
    method: string,
    productionId: string,
    ...args: unknown[]
  ) {
    if (method in engine) {
      return (
        engine as unknown as Record<
          string,
          (id: string, ...a: unknown[]) => Promise<unknown>
        >
      )[method](productionId, ...args);
    }
    throw new BadRequestException(
      `${method.toUpperCase()} not supported by this engine`,
    );
  }
}
