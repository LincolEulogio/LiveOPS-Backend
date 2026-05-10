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

interface ProductionWithCloud extends Production {
  activeEgressId: string | null;
  activeRecordingId: string | null;
}

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
    // APP mode has no local engine; callers must handle null
    return null as unknown as IVideoEngine;
  }

  async getStreamingState(productionId: string) {
    const production = (await this.prisma.production.findUnique({
      where: { id: productionId },
      include: { streamingDestinations: { orderBy: { createdAt: 'asc' } } },
    })) as (ProductionWithCloud & { streamingDestinations: StreamingDestination[] }) | null;

    if (!production) {
      throw new NotFoundException('Production not found');
    }

    const isAppMode = production.engineType === 'APP';
    const engine = isAppMode ? null : this.getEngine(production);
    const state = engine
      ? await engine.getRealTimeState(productionId)
      : { isConnected: true };

    return {
      productionId,
      engineType: production.engineType,
      status: production.status,
      isConnected: state.isConnected,
      activeEgressId: production.activeEgressId ?? null,
      activeRecordingId: production.activeRecordingId ?? null,
      destinations: production.streamingDestinations,
      obs: production.engineType === 'OBS' ? state : null,
      vmix: production.engineType === 'VMIX' ? state : null,
      lastUpdate: new Date().toISOString(),
    };
  }

  async startCloudStream(productionId: string, layout?: string) {
    const production = (await this.prisma.production.findUnique({
      where: { id: productionId },
      include: { streamingDestinations: true },
    })) as
      | (ProductionWithCloud & {
          streamingDestinations: StreamingDestination[];
        })
      | null;

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

    let egressId: string | undefined;
    try {
      const roomName = `production_${productionId}`;

      await this.liveKitService.ensureRoomExists(roomName);

      const egressInfo = await this.liveKitService.startRoomCompositeEgress(
        roomName,
        rtmpUrls,
        layout,
      );
      egressId = egressInfo.egressId;

      await this.prisma.production.update({
        where: { id: productionId },
        data: { activeEgressId: egressId },
      });

      this.logger.log(
        `Cloud stream started for production ${productionId} with egressId ${egressId}`,
      );
      return { success: true, egressId };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(`Failed to start cloud stream: ${message}`);

      // Rollback: stop egress if it was started but DB write failed
      if (egressId) {
        try {
          await this.liveKitService.stopEgress(egressId);
          this.logger.warn(`Rolled back egress ${egressId} after DB failure`);
        } catch (rollbackErr) {
          this.logger.error(`Rollback failed for egress ${egressId}: ${getErrorMessage(rollbackErr)}`);
        }
      }

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
      await this.liveKitService.stopEgress(production.activeEgressId);

      await this.prisma.production.update({
        where: { id: productionId },
        data: { activeEgressId: null },
      });

      this.logger.log(`Cloud stream stopped for production ${productionId}`);
      return { success: true };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(`Failed to stop cloud stream: ${message}`);
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

  async startCloudRecording(productionId: string, layout?: string) {
    const production = (await this.prisma.production.findUnique({
      where: { id: productionId },
    })) as ProductionWithCloud | null;

    if (!production) {
      throw new NotFoundException('Production not found');
    }

    if (production.activeRecordingId) {
      throw new BadRequestException('Cloud recording already active');
    }

    try {
      const roomName = `production_${productionId}`;
      await this.liveKitService.ensureRoomExists(roomName);

      const egressInfo = await this.liveKitService.startRoomCompositeRecording(
        roomName,
        layout,
      );

      await this.prisma.production.update({
        where: { id: productionId },
        data: { activeRecordingId: egressInfo.egressId },
      });

      this.logger.log(
        `Cloud recording started for production ${productionId} with egressId ${egressInfo.egressId}`,
      );
      return { success: true, egressId: egressInfo.egressId };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(`Failed to start cloud recording: ${message}`);
      throw new BadRequestException(
        `Failed to start cloud recording: ${message}`,
      );
    }
  }

  async stopCloudRecording(productionId: string) {
    const production = (await this.prisma.production.findUnique({
      where: { id: productionId },
    })) as ProductionWithCloud | null;

    if (!production) {
      throw new NotFoundException('Production not found');
    }

    if (!production.activeRecordingId) {
      throw new BadRequestException('No active cloud recording found');
    }

    try {
      await this.liveKitService.stopEgress(production.activeRecordingId);

      await this.prisma.production.update({
        where: { id: productionId },
        data: { activeRecordingId: null },
      });

      this.logger.log(`Cloud recording stopped for production ${productionId}`);
      return { success: true };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(`Failed to stop cloud recording: ${message}`);
      await this.prisma.production.update({
        where: { id: productionId },
        data: { activeRecordingId: null },
      });
      return {
        success: true,
        warning: 'Local state reset but LiveKit reported error',
      };
    }
  }

  async handleCommand(
    productionId: string,
    dto: StreamingCommandDto,
  ): Promise<void | Record<string, unknown>> {
    const production = await this.prisma.production.findUnique({
      where: { id: productionId },
    });
    if (!production) throw new NotFoundException('Production not found');

    const isAppMode = production.engineType === 'APP';
    const engine = isAppMode ? null : this.getEngine(production);
    const p = dto.payload as Record<string, unknown>;

    const engineRequired = (fn: () => Promise<void | Record<string, unknown>>) => {
      if (!engine) throw new BadRequestException('Este comando requiere OBS o vMix conectado. Esta producción usa modo App.');
      return fn();
    };

    type CommandHandler = () => Promise<void | Record<string, unknown>>;
    const commands: Partial<Record<string, CommandHandler>> = {
      CHANGE_SCENE: () => engineRequired(() =>
        this.handleChangeScene(engine!, productionId, dto.sceneName)),
      SET_PREVIEW_SCENE: () => engineRequired(() =>
        this.handleSetPreviewScene(engine!, productionId, dto.sceneName)),
      START_STREAM: () => engineRequired(() => engine!.startStream(productionId)),
      STOP_STREAM: () => engineRequired(() => engine!.stopStream(productionId)),
      START_CLOUD_STREAM: () =>
        this.startCloudStream(productionId, p?.layout as string),
      STOP_CLOUD_STREAM: () => this.stopCloudStream(productionId),
      START_CLOUD_RECORDING: () =>
        this.startCloudRecording(productionId, p?.layout as string),
      STOP_CLOUD_RECORDING: () => this.stopCloudRecording(productionId),
      START_RECORD: () => engineRequired(() => engine!.startRecord(productionId)),
      STOP_RECORD: () => engineRequired(() => engine!.stopRecord(productionId)),
      START_REPLAY_BUFFER: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'startReplayBuffer', productionId) as Promise<void>),
      STOP_REPLAY_BUFFER: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'stopReplayBuffer', productionId) as Promise<void>),
      SAVE_REPLAY_BUFFER: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'saveReplayBuffer', productionId) as Promise<void>),
      START_VIRTUAL_CAM: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'startVirtualCam', productionId) as Promise<void>),
      STOP_VIRTUAL_CAM: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'stopVirtualCam', productionId) as Promise<void>),
      SET_TBAR: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'setTBarPosition', productionId, p?.position) as Promise<void>),
      RELEASE_TBAR: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'releaseTBar', productionId) as Promise<void>),
      TRIGGER_TRANSITION: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'triggerTransition', productionId) as Promise<void>),
      SET_TRANSITION: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'setCurrentTransition', productionId, p?.transitionName, p?.transitionDuration) as Promise<void>),
      SET_SCENE_COLLECTION: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'setCurrentSceneCollection', productionId, p?.sceneCollectionName) as Promise<void>),
      SET_STUDIO_MODE: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'setStudioMode', productionId, p?.enabled) as Promise<void>),
      VMIX_CUT: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'cut', productionId) as Promise<void>),
      VMIX_FADE: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'fade', productionId) as Promise<void>),
      VMIX_SELECT_INPUT: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'changeInput', productionId, p?.input as number) as Promise<void>),
      VMIX_SET_VOLUME: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'setVolume', productionId, p?.input, p?.value) as Promise<void>),
      VMIX_TOGGLE_MUTE: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'toggleMute', productionId, p?.input) as Promise<void>),
      VMIX_TOGGLE_SOLO: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'toggleSolo', productionId, p?.input) as Promise<void>),
      VMIX_SET_GAIN: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'setGain', productionId, p?.input, p?.value) as Promise<void>),
      VMIX_TOGGLE_BUS: () => engineRequired(() =>
        this.executeEngineMethod(engine!, 'toggleBus', productionId, p?.input, p?.bus) as Promise<void>),
      START_DESTINATION: () =>
        this.startDestination(productionId, p?.destId as string),
      STOP_DESTINATION: () =>
        this.stopDestination(productionId, p?.destId as string),
    };

    const handler = commands[dto.type];
    if (!handler) throw new BadRequestException(`Unknown command: ${dto.type}`);
    return handler();
  }

  async startDestination(productionId: string, destId: string) {
    if (!destId) throw new BadRequestException('destId is required');

    const [destination, production] = await Promise.all([
      this.prisma.streamingDestination.findUnique({ where: { id: destId } }),
      this.prisma.production.findUnique({ where: { id: productionId } }),
    ]);

    if (!destination) throw new NotFoundException('Destination not found');
    if (!production) throw new NotFoundException('Production not found');
    if (destination.productionId !== productionId)
      throw new BadRequestException('Destination does not belong to this production');
    if (destination.isActive)
      throw new BadRequestException(`${destination.name} ya está transmitiendo`);

    const isAppMode = production.engineType === 'APP';
    const engine = isAppMode ? null : this.getEngine(production);

    if (engine?.startStreamToDestination) {
      // Engine-native path: OBS/vMix streams directly to the platform RTMP
      await engine.startStreamToDestination(productionId, destination.rtmpUrl, destination.streamKey);
    } else {
      // APP mode or fallback: LiveKit Egress composites the room and pushes to RTMP
      const activeState = ((production.activeState as Record<string, unknown>) ?? {}) as Record<string, unknown>;
      const destEgresses = ((activeState.destinationEgresses ?? {}) as Record<string, string>);

      const roomName = `production_${productionId}`;
      await this.liveKitService.ensureRoomExists(roomName);
      const rtmpTarget = `${destination.rtmpUrl}${destination.streamKey}`;
      const egressInfo = await this.liveKitService.startRoomCompositeEgress(roomName, [rtmpTarget]);
      destEgresses[destId] = egressInfo.egressId;

      await this.prisma.production.update({
        where: { id: productionId },
        data: { activeState: { ...activeState, destinationEgresses: destEgresses } },
      });
    }

    await this.prisma.streamingDestination.update({
      where: { id: destId },
      data: { isActive: true },
    });

    this.logger.log(`Destination "${destination.name}" (${destination.platform}) started for production ${productionId}`);
    return { success: true, destId, platform: destination.platform, name: destination.name };
  }

  async stopDestination(productionId: string, destId: string) {
    if (!destId) throw new BadRequestException('destId is required');

    const [destination, production] = await Promise.all([
      this.prisma.streamingDestination.findUnique({ where: { id: destId } }),
      this.prisma.production.findUnique({ where: { id: productionId } }),
    ]);

    if (!destination) throw new NotFoundException('Destination not found');
    if (!production) throw new NotFoundException('Production not found');
    if (!destination.isActive)
      throw new BadRequestException('Este destino no está transmitiendo');

    const isAppMode = production.engineType === 'APP';
    const engine = isAppMode ? null : this.getEngine(production);

    if (engine?.stopStreamFromDestination) {
      await engine.stopStreamFromDestination(productionId);
    } else {
      // LiveKit Egress fallback
      const activeState = ((production.activeState as Record<string, unknown>) ?? {}) as Record<string, unknown>;
      const destEgresses = ((activeState.destinationEgresses ?? {}) as Record<string, string>);
      const egressId = destEgresses[destId];
      if (egressId) {
        try { await this.liveKitService.stopEgress(egressId); } catch (err) {
          this.logger.warn(`Could not stop egress ${egressId}: ${getErrorMessage(err)}`);
        }
        delete destEgresses[destId];
        await this.prisma.production.update({
          where: { id: productionId },
          data: { activeState: { ...activeState, destinationEgresses: destEgresses } },
        });
      }
    }

    await this.prisma.streamingDestination.update({
      where: { id: destId },
      data: { isActive: false },
    });

    this.logger.log(`Destination "${destination.name}" stopped for production ${productionId}`);
    return { success: true, destId };
  }

  private async handleChangeScene(
    engine: IVideoEngine,
    productionId: string,
    sceneName?: string,
  ): Promise<void | Record<string, unknown>> {
    if (!sceneName) {
      throw new BadRequestException('sceneName is required');
    }
    if ('changeScene' in engine) {
      return (engine as unknown as ISceneEngine).changeScene(productionId, sceneName);
    }
    throw new BadRequestException('CHANGE_SCENE not supported by this engine');
  }

  private async handleSetPreviewScene(
    engine: IVideoEngine,
    productionId: string,
    sceneName?: string,
  ): Promise<void | Record<string, unknown>> {
    if (!sceneName) {
      throw new BadRequestException('sceneName is required');
    }
    const sceneEngine = engine as unknown as ISceneEngine;
    if (sceneEngine.setPreviewScene) {
      return sceneEngine.setPreviewScene(productionId, sceneName);
    }
    // Fallback: use changeScene if no preview scene support (e.g. non-studio-mode)
    if ('changeScene' in engine) {
      return sceneEngine.changeScene(productionId, sceneName);
    }
    throw new BadRequestException('SET_PREVIEW_SCENE not supported by this engine');
  }

  private async executeEngineMethod(
    engine: IVideoEngine,
    method: string,
    productionId: string,
    ...args: unknown[]
  ): Promise<void | Record<string, unknown>> {
    if (method in engine) {
      return (
        engine as unknown as Record<
          string,
          (
            id: string,
            ...a: unknown[]
          ) => Promise<void | Record<string, unknown>>
        >
      )[method](productionId, ...args);
    }
    throw new BadRequestException(
      `${method.toUpperCase()} not supported by this engine`,
    );
  }
}
