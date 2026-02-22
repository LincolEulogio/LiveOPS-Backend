import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObsConnectionManager } from './obs-connection.manager';
import { SaveObsConnectionDto, ChangeSceneDto } from './dto/obs.dto';

@Injectable()
export class ObsService {
  private readonly logger = new Logger(ObsService.name);

  constructor(
    private prisma: PrismaService,
    private obsManager: ObsConnectionManager,
  ) {}

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
      return { success: true, sceneName: dto.sceneName };
    } catch (e: any) {
      this.logger.error(`Failed to change scene: ${e.message}`);
      throw new BadRequestException(`OBS Error: ${e.message || 'Unknown'}`);
    }
  }

  async startStream(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StartStream');
      return { success: true };
    } catch (e: any) {
      this.logger.error(`Failed to start stream: ${e.message}`);
      throw new BadRequestException(`OBS Error: ${e.message || 'Unknown'}`);
    }
  }

  async stopStream(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StopStream');
      return { success: true };
    } catch (e: any) {
      this.logger.error(`Failed to stop stream: ${e.message}`);
      throw new BadRequestException(`OBS Error: ${e.message || 'Unknown'}`);
    }
  }

  async startRecord(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StartRecord');
      return { success: true };
    } catch (e: any) {
      this.logger.error(`Failed to start record: ${e.message}`);
      throw new BadRequestException(`OBS Error: ${e.message || 'Unknown'}`);
    }
  }

  async stopRecord(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StopRecord');
      return { success: true };
    } catch (e: any) {
      this.logger.error(`Failed to stop record: ${e.message}`);
      throw new BadRequestException(`OBS Error: ${e.message || 'Unknown'}`);
    }
  }
}
