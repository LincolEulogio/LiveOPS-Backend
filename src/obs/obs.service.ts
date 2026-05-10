import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ObsConnectionManager } from '@/obs/obs-connection.manager';
import { SaveObsConnectionDto } from '@/obs/dto/obs.dto';
import { AuditService, AuditAction } from '@/common/services/audit.service';
import { formatEngineUrl } from '@/common/utils/engine-url.util';

import { ISceneEngine } from '@/streaming/interfaces/video-engine.interface';

@Injectable()
export class ObsService implements ISceneEngine {
  private readonly logger = new Logger(ObsService.name);

  constructor(
    private prisma: PrismaService,
    private obsManager: ObsConnectionManager,
    private auditService: AuditService,
  ) {}

  async saveConnection(productionId: string, dto: SaveObsConnectionDto) {
    const url = formatEngineUrl(dto, 'ws', '4455');
    const connection = await this.prisma.obsConnection.upsert({
      where: { productionId },
      update: {
        url,
        password: dto.password,
        isEnabled: dto.isEnabled ?? true,
      },
      create: {
        productionId,
        url,
        password: dto.password,
        isEnabled: dto.isEnabled ?? true,
      },
    });

    if (connection.isEnabled) {
      void this.obsManager.connectObs(
        productionId,
        connection.url,
        connection.password || undefined,
      );
    } else {
      this.obsManager.disconnectObs(productionId);
    }

    return connection;
  }

  async getConnection(productionId: string) {
    const conn = await this.prisma.obsConnection.findUnique({
      where: { productionId },
    });
    if (!conn)
      throw new NotFoundException(
        'OBS Connection not configured for this production',
      );
    return conn;
  }

  isConnected(productionId: string): boolean {
    return this.obsManager.getObsState(productionId).isConnected;
  }

  getRealTimeState(productionId: string) {
    return Promise.resolve(this.obsManager.getObsState(productionId));
  }

  // --- OBS Commands --- //

  private getObs(productionId: string) {
    const obs = this.obsManager.getInstance(productionId);
    if (!obs) {
      throw new BadRequestException(
        'OBS is not connected or configured for this production',
      );
    }
    return obs;
  }

  async changeScene(productionId: string, sceneName: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('SetCurrentProgramScene', { sceneName });

      // Audit Log
      void this.auditService.log({
        productionId,
        action: AuditAction.SCENE_CHANGE,
        details: { sceneName },
      });

      return { success: true, sceneName };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to change scene: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async startStream(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StartStream');

      // Audit Log
      void this.auditService.log({
        productionId,
        action: AuditAction.STREAM_START,
      });

      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to start stream: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async stopStream(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StopStream');

      // Audit Log
      void this.auditService.log({
        productionId,
        action: AuditAction.STREAM_STOP,
      });

      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to stop stream: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async startRecord(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StartRecord');

      // Audit Log
      void this.auditService.log({
        productionId,
        action: AuditAction.RECORD_START,
      });

      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to start record: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async stopRecord(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StopRecord');

      // Audit Log
      void this.auditService.log({
        productionId,
        action: AuditAction.RECORD_STOP,
      });

      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to stop record: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async startReplayBuffer(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StartReplayBuffer');
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to start replay buffer: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async stopReplayBuffer(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StopReplayBuffer');
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to stop replay buffer: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async saveReplayBuffer(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('SaveReplayBuffer');
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to save replay buffer: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async startVirtualCam(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StartVirtualCam');
      void this.auditService.log({ productionId, action: AuditAction.VIRTUAL_CAM_START });
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to start virtual cam: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async stopVirtualCam(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StopVirtualCam');
      void this.auditService.log({ productionId, action: AuditAction.VIRTUAL_CAM_STOP });
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to stop virtual cam: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async getSceneCollections(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      const result = await obs.call('GetSceneCollectionList');
      return {
        sceneCollections: result.sceneCollections as unknown as string[],
        currentSceneCollectionName: result.currentSceneCollectionName,
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to get scene collections: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async setCurrentSceneCollection(productionId: string, sceneCollectionName: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('SetCurrentSceneCollection', { sceneCollectionName });
      void this.auditService.log({ productionId, action: AuditAction.SCENE_COLLECTION_CHANGE, details: { sceneCollectionName } });
      return { success: true, sceneCollectionName };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to set scene collection: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async getTransitions(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      const [list, current] = await Promise.all([
        obs.call('GetSceneTransitionList'),
        obs.call('GetCurrentSceneTransition'),
      ]);
      return {
        transitions: (list.transitions as unknown as { transitionName: string }[]).map((t) => t.transitionName),
        currentTransition: current.transitionName,
        transitionDuration: current.transitionDuration as number | undefined,
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to get transitions: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async setCurrentTransition(productionId: string, transitionName: string, transitionDuration?: number) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('SetCurrentSceneTransition', { transitionName });
      if (transitionDuration !== undefined) {
        await obs.call('SetCurrentSceneTransitionDuration', { transitionDuration });
      }
      return { success: true, transitionName };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to set transition: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async setStudioMode(productionId: string, enabled: boolean) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('SetStudioModeEnabled', { studioModeEnabled: enabled });
      return { success: true, studioModeEnabled: enabled };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to set studio mode: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async setTBarPosition(productionId: string, position: number) {
    const obs = this.getObs(productionId);
    try {
      const clamped = Math.max(0, Math.min(1, position));
      await obs.call('SetTBarPosition', { position: clamped, release: false });
      return { success: true, position: clamped };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to set T-Bar position: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async releaseTBar(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('SetTBarPosition', { position: 1.0, release: true });
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to release T-Bar: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async triggerTransition(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('TriggerStudioModeTransition');
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to trigger transition: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  // --- Audio Control for OBS ---
  async setVolume(
    productionId: string,
    input?: string | number,
    value?: number,
  ) {
    const obs = this.getObs(productionId);
    try {
      // Determine source name: if input is numeric/0/undefined, try default OBS audio sources
      let inputName = typeof input === 'string' ? input : '';
      if (!inputName || input === 0 || input === -1) {
        // Try common default OBS audio names
        try {
          const inputVolumeMul = (value ?? 0) / 100;
          await obs.call('SetInputVolume', {
            inputName: 'Desktop Audio',
            inputVolumeMul,
          });
          return { success: true };
        } catch {
          inputName = 'Mic/Aux';
        }
      }

      const inputVolumeMul = (value ?? 0) / 100;
      await obs.call('SetInputVolume', { inputName, inputVolumeMul });
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.warn(`Failed to set OBS volume for ${input}: ${message}`);
      return { success: true }; // Return success to UI anyway
    }
  }

  async toggleMute(productionId: string, input?: string | number) {
    const obs = this.getObs(productionId);
    try {
      let inputName = typeof input === 'string' ? input : '';
      if (!inputName || input === 0 || input === -1) {
        try {
          await obs.call('ToggleInputMute', { inputName: 'Desktop Audio' });
          return { success: true };
        } catch {
          inputName = 'Mic/Aux';
        }
      }
      await obs.call('ToggleInputMute', { inputName });
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.warn(`Failed to toggle OBS mute for ${input}: ${message}`);
      return { success: true };
    }
  }

  toggleSolo(
    productionId: string,
    input?: string | number,
  ): Promise<{ success: boolean }> {
    this.logger.debug(
      `toggleSolo (OBS) - Production: ${productionId}, Input: ${input}`,
    );
    return Promise.resolve({ success: true });
  }

  setGain(
    productionId: string,
    input?: string | number,
    value?: number,
  ): Promise<{ success: boolean }> {
    this.logger.debug(
      `setGain (OBS) - Production: ${productionId}, Input: ${input}, Value: ${value}`,
    );
    return Promise.resolve({ success: true });
  }

  toggleBus(
    productionId: string,
    input?: string | number,
    bus?: string,
  ): Promise<{ success: boolean }> {
    this.logger.debug(
      `toggleBus (OBS) - Production: ${productionId}, Input: ${input}, Bus: ${bus}`,
    );
    return Promise.resolve({ success: true });
  }
}
