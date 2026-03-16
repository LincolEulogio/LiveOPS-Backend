import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { VmixConnectionManager } from '@/vmix/vmix-connection.manager';
import { SaveVmixConnectionDto, ChangeInputDto } from '@/vmix/dto/vmix.dto';
import { AuditService, AuditAction } from '@/common/services/audit.service';

import { IInputEngine } from '@/streaming/interfaces/video-engine.interface';

@Injectable()
export class VmixService implements IInputEngine {
  private readonly logger = new Logger(VmixService.name);

  constructor(
    private prisma: PrismaService,
    private vmixManager: VmixConnectionManager,
    private auditService: AuditService,
  ) {}

  async saveConnection(productionId: string, dto: SaveVmixConnectionDto) {
    const connection = await this.prisma.vmixConnection.upsert({
      where: { productionId },
      update: {
        url: dto.url,
        isEnabled: dto.isEnabled ?? true,
        pollingInterval: dto.pollingInterval ?? 1500, // Defecto más conservador para vMix
      },
      create: {
        productionId,
        url: dto.url,
        isEnabled: dto.isEnabled ?? true,
        pollingInterval: dto.pollingInterval ?? 1500,
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

  async changeInput(productionId: string, input: number) {
    try {
      // selecting an input in the matrix usually takes it to PREVIEW first
      await this.vmixManager.sendCommand(productionId, 'PreviewInput', {
        Input: input,
      });

      // Audit Trail
      this.auditService.log({
        productionId,
        action: AuditAction.SCENE_CHANGE,
        details: { engine: 'vmix', input, target: 'preview' },
      });

      return { success: true, input, action: 'preview' };
    } catch (e: unknown) {
      const error = e as Error;
      this.logger.error(`Failed to change input: ${error.message}`);
      throw new BadRequestException(
        `vMix Error: ${error.message || 'Unknown'}`,
      );
    }
  }

  async cut(productionId: string) {
    try {
      // Triggers whatever is in Preview to cut to Active
      await this.vmixManager.sendCommand(productionId, 'Cut');

      // Audit Trail
      this.auditService.log({
        productionId,
        action: AuditAction.SCENE_CHANGE,
        details: { engine: 'vmix', action: 'cut', target: 'program' },
      });

      return { success: true, action: 'cut' };
    } catch (e: unknown) {
      const error = e as Error;
      this.logger.error(`Failed to trigger cut: ${error.message}`);
      throw new BadRequestException(
        `vMix Error: ${error.message || 'Unknown'}`,
      );
    }
  }

  async fade(productionId: string, duration?: number) {
    try {
      // Triggers a fade transition from Preview to Active
      const params = duration ? { Duration: duration } : undefined;
      await this.vmixManager.sendCommand(productionId, 'Fade', params);

      // Audit Trail
      this.auditService.log({
        productionId,
        action: AuditAction.SCENE_CHANGE,
        details: {
          engine: 'vmix',
          action: 'fade',
          duration: duration,
          target: 'program',
        },
      });

      return { success: true, action: 'fade', duration: duration };
    } catch (e: unknown) {
      const error = e as Error;
      this.logger.error(`Failed to trigger fade: ${error.message}`);
      throw new BadRequestException(
        `vMix Error: ${error.message || 'Unknown'}`,
      );
    }
  }

  // IVideoEngine implementation stubs (to be fully implemented if vMix API wrapper supports them)
  async startStream(productionId: string) {
    await this.vmixManager.sendCommand(productionId, 'StartStreaming');
    return { success: true };
  }
  async stopStream(productionId: string) {
    await this.vmixManager.sendCommand(productionId, 'StopStreaming');
    return { success: true };
  }
  async startRecord(productionId: string) {
    await this.vmixManager.sendCommand(productionId, 'StartRecording');
    return { success: true };
  }
  async stopRecord(productionId: string) {
    await this.vmixManager.sendCommand(productionId, 'StopRecording');
    return { success: true };
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
      throw new BadRequestException(
        `vMix Error: ${error.message || 'Unknown'}`,
      );
    }
  }

  // Alias for IVideoEngine.saveReplayBuffer
  async saveReplayBuffer(productionId: string) {
    return this.saveVideoDelay(productionId);
  }
}
