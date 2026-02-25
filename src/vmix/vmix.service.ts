import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { VmixConnectionManager } from '@/vmix/vmix-connection.manager';
import { SaveVmixConnectionDto, ChangeInputDto } from '@/vmix/dto/vmix.dto';

@Injectable()
export class VmixService {
  private readonly logger = new Logger(VmixService.name);

  constructor(
    private prisma: PrismaService,
    private vmixManager: VmixConnectionManager,
  ) { }

  async saveConnection(productionId: string, dto: SaveVmixConnectionDto) {
    const connection = await this.prisma.vmixConnection.upsert({
      where: { productionId },
      update: {
        url: dto.url,
        isEnabled: dto.isEnabled ?? true,
        pollingInterval: dto.pollingInterval ?? 500,
      },
      create: {
        productionId,
        url: dto.url,
        isEnabled: dto.isEnabled ?? true,
        pollingInterval: dto.pollingInterval ?? 500,
      },
    });

    if (connection.isEnabled) {
      this.vmixManager.connectVmix(
        productionId,
        connection.url,
        connection.pollingInterval,
      );
    } else {
      this.vmixManager.stopPolling(productionId);
    }

    return connection;
  }

  async getConnection(productionId: string) {
    const conn = await this.prisma.vmixConnection.findUnique({
      where: { productionId },
    });
    if (!conn)
      throw new NotFoundException(
        'vMix Connection not configured for this production',
      );
    return conn;
  }

  isConnected(productionId: string): boolean {
    return this.vmixManager.isConnected(productionId);
  }

  async getRealTimeState(productionId: string) {
    return this.vmixManager.getVmixState(productionId);
  }

  // --- vMix Commands --- //

  async changeInput(productionId: string, dto: ChangeInputDto) {
    try {
      // selecting an input in the matrix usually takes it to PREVIEW first
      await this.vmixManager.sendCommand(productionId, 'PreviewInput', {
        Input: dto.input,
      });
      return { success: true, input: dto.input, action: 'preview' };
    } catch (e: unknown) {
      const error = e as Error;
      this.logger.error(`Failed to change input: ${error.message}`);
      throw new BadRequestException(`vMix Error: ${error.message || 'Unknown'}`);
    }
  }

  async cut(productionId: string) {
    try {
      // Triggers whatever is in Preview to cut to Active
      await this.vmixManager.sendCommand(productionId, 'Cut');
      return { success: true, action: 'cut' };
    } catch (e: unknown) {
      const error = e as Error;
      this.logger.error(`Failed to trigger cut: ${error.message}`);
      throw new BadRequestException(`vMix Error: ${error.message || 'Unknown'}`);
    }
  }

  async fade(productionId: string, dto?: { duration?: number }) {
    try {
      // Triggers a fade transition from Preview to Active
      const params = dto?.duration ? { Duration: dto.duration } : undefined;
      await this.vmixManager.sendCommand(productionId, 'Fade', params);
      return { success: true, action: 'fade', duration: dto?.duration };
    } catch (e: unknown) {
      const error = e as Error;
      this.logger.error(`Failed to trigger fade: ${error.message}`);
      throw new BadRequestException(`vMix Error: ${error.message || 'Unknown'}`);
    }
  }

  async saveVideoDelay(productionId: string) {
    try {
      // Saves all video delay inputs
      await this.vmixManager.sendCommand(productionId, 'VideoDelaySave', {
        Input: -1,
      });
      return { success: true, action: 'videoDelaySave' };
    } catch (e: unknown) {
      const error = e as Error;
      this.logger.error(`Failed to save video delay: ${error.message}`);
      throw new BadRequestException(`vMix Error: ${error.message || 'Unknown'}`);
    }
  }
}
