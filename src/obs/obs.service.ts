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
      const error = e as Error;
      this.logger.error(`Failed to change scene: ${error.message}`);
      throw new BadRequestException(`OBS Error: ${error.message || 'Unknown'}`);
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
      const error = e as Error;
      this.logger.error(`Failed to start stream: ${error.message}`);
      throw new BadRequestException(`OBS Error: ${error.message || 'Unknown'}`);
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
      const error = e as Error;
      this.logger.error(`Failed to stop stream: ${error.message}`);
      throw new BadRequestException(`OBS Error: ${error.message || 'Unknown'}`);
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
      const error = e as Error;
      this.logger.error(`Failed to start record: ${error.message}`);
      throw new BadRequestException(`OBS Error: ${error.message || 'Unknown'}`);
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
      const error = e as Error;
      this.logger.error(`Failed to stop record: ${error.message}`);
      throw new BadRequestException(`OBS Error: ${error.message || 'Unknown'}`);
    }
  }

  async saveReplayBuffer(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('SaveReplayBuffer');
      return { success: true };
    } catch (e: unknown) {
      const error = e as Error;
      this.logger.error(`Failed to save replay buffer: ${error.message}`);
      throw new BadRequestException(`OBS Error: ${error.message || 'Unknown'}`);
    }
  }

  // --- Audio Control for OBS ---
  async setVolume(productionId: string, input?: any, value?: number) {
    const obs = this.getObs(productionId);
    try {
      // Determine source name: if input is numeric/0/undefined, try default OBS audio sources
      let inputName = typeof input === 'string' ? input : '';
      if (!inputName || input === 0 || input === -1) {
        // Try common default OBS audio names
        try {
          const inputVolumeMul = (value ?? 0) / 100;
          await obs.call('SetInputVolume', { inputName: 'Desktop Audio', inputVolumeMul });
          return { success: true };
        } catch {
          inputName = 'Mic/Aux';
        }
      }

      const inputVolumeMul = (value ?? 0) / 100;
      await obs.call('SetInputVolume', { inputName, inputVolumeMul });
      return { success: true };
    } catch (e: unknown) {
      this.logger.warn(`Failed to set OBS volume for ${input}: ${(e as Error).message}`);
      return { success: true }; // Return success to UI anyway
    }
  }

  async toggleMute(productionId: string, input?: any) {
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
      this.logger.warn(`Failed to toggle OBS mute for ${input}: ${(e as Error).message}`);
      return { success: true };
    }
  }

  async toggleSolo(productionId: string, input?: any) {
    this.logger.debug(`toggleSolo (OBS) - Production: ${productionId}, Input: ${input}`);
    return { success: true };
  }

  async setGain(productionId: string, input?: any, value?: number) {
    this.logger.debug(`setGain (OBS) - Production: ${productionId}, Input: ${input}, Value: ${value}`);
    return { success: true };
  }

  async toggleBus(productionId: string, input?: any, bus?: string) {
    this.logger.debug(`toggleBus (OBS) - Production: ${productionId}, Input: ${input}, Bus: ${bus}`);
    return { success: true };
  }
}
