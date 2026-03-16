import {
  AccessToken,
  EgressClient,
  StreamOutput,
  StreamProtocol,
} from 'livekit-server-sdk';
import { Production, StreamingDestination } from '@prisma/client';

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);

  constructor(
    private prisma: PrismaService,
    private obsService: ObsService,
    private vmixService: VmixService,
    private liveKitService: LiveKitService,
  ) { }

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
      activeEgressId: production.activeEgressId,
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

    if (!production) throw new NotFoundException('Production not found');
    if (production.activeEgressId) throw new BadRequestException('Cloud stream already active');

    const enabledDestinations = production.streamingDestinations.filter(d => d.isEnabled);
    if (enabledDestinations.length === 0) {
      throw new BadRequestException('No enabled streaming destinations found');
    }

    const rtmpUrls = enabledDestinations.map(d => `${d.rtmpUrl}${d.streamKey}`);

    try {
      const egressInfo = await this.liveKitService.startRoomCompositeEgress(
        productionId,
        rtmpUrls,
        layout,
      );

      await this.prisma.production.update({
        where: { id: productionId },
        data: { activeEgressId: egressInfo.egressId },
      });

      this.logger.log(`Cloud stream started for production ${productionId} with egressId ${egressInfo.egressId}`);
      return { success: true, egressId: egressInfo.egressId };
    } catch (error) {
      this.logger.error(`Failed to start cloud stream: ${error.message}`);
      throw new BadRequestException(`Failed to start cloud stream: ${error.message}`);
    }
  }

  async stopCloudStream(productionId: string) {
    const production = await this.prisma.production.findUnique({
      where: { id: productionId },
    });

    if (!production) throw new NotFoundException('Production not found');
    if (!production.activeEgressId) throw new BadRequestException('No active cloud stream found');

    try {
      await this.liveKitService.stopEgress(production.activeEgressId);

      await this.prisma.production.update({
        where: { id: productionId },
        data: { activeEgressId: null },
      });

      this.logger.log(`Cloud stream stopped for production ${productionId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to stop cloud stream: ${error.message}`);
      // Even if LiveKit fails to stop it (e.g. already stopped), we reset our local state
      await this.prisma.production.update({
        where: { id: productionId },
        data: { activeEgressId: null },
      });
      return { success: true, warning: 'Local state reset but LiveKit reported error' };
    }
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
      case 'START_CLOUD_STREAM': {
        const payload = dto.payload as Record<string, any>;
        return this.startCloudStream(productionId, payload?.layout);
      }
      case 'STOP_CLOUD_STREAM':
        return this.stopCloudStream(productionId);
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
