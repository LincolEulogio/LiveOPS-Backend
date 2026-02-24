import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObsConnectionManager } from './obs-connection.manager';
import { SaveObsConnectionDto, ChangeSceneDto } from './dto/obs.dto';
import { AuditService, AuditAction } from '../common/services/audit.service';

@Injectable()
export class ObsService {
  private readonly logger = new Logger(ObsService.name);

  constructor(
    private prisma: PrismaService,
    private obsManager: ObsConnectionManager,
    private auditService: AuditService,
  ) { }

  async saveConnection(productionId: string, dto: SaveObsConnectionDto) {
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
      this.obsManager.connectObs(
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

  async getRealTimeState(productionId: string) {
    return this.obsManager.getObsState(productionId);
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

  async changeScene(productionId: string, dto: ChangeSceneDto) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('SetCurrentProgramScene', { sceneName: dto.sceneName });

      // Audit Log
      this.auditService.log({
        productionId,
        action: AuditAction.SCENE_CHANGE,
        details: { sceneName: dto.sceneName },
      });

      return { success: true, sceneName: dto.sceneName };
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
      this.auditService.log({
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
      this.auditService.log({
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
      this.auditService.log({
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
      this.auditService.log({
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
}
