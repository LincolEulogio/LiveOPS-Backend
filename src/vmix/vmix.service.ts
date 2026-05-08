import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { VmixConnectionManager } from '@/vmix/vmix-connection.manager';
import { SaveVmixConnectionDto } from '@/vmix/dto/vmix.dto';
import { AuditService, AuditAction } from '@/common/services/audit.service';
import { formatEngineUrl } from '@/common/utils/engine-url.util';

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
    const url = formatEngineUrl(dto, 'http', '8088');

    const connection = await this.prisma.vmixConnection.upsert({
      where: { productionId },
      update: {
        url,
        isEnabled: dto.isEnabled ?? true,
        pollingInterval: dto.pollingInterval ?? 1500,
      },
      create: {
        productionId,
        url,
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

  getRealTimeState(productionId: string) {
    return Promise.resolve(this.vmixManager.getVmixState(productionId));
  }

  // --- vMix Commands --- //

  async changeInput(productionId: string, input: number) {
    try {
      // selecting an input in the matrix usually takes it to PREVIEW first
      await this.vmixManager.sendCommand(productionId, 'PreviewInput', {
        Input: input,
      });

      // Audit Trail
      void this.auditService.log({
        productionId,
        action: AuditAction.SCENE_CHANGE,
        details: { engine: 'vmix', input, target: 'preview' },
      });

      return { success: true, input, action: 'preview' };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to change input: ${message}`);
      throw new BadRequestException(`vMix Error: ${message || 'Unknown'}`);
    }
  }

  async cut(productionId: string) {
    try {
      // Triggers whatever is in Preview to cut to Active
      await this.vmixManager.sendCommand(productionId, 'Cut');

      // Audit Trail
      void this.auditService.log({
        productionId,
        action: AuditAction.SCENE_CHANGE,
        details: { engine: 'vmix', action: 'cut', target: 'program' },
      });

      return { success: true, action: 'cut' };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to trigger cut: ${message}`);
      throw new BadRequestException(`vMix Error: ${message || 'Unknown'}`);
    }
  }

  async fade(productionId: string, duration?: number) {
    try {
      // Triggers a fade transition from Preview to Active
      const params = duration ? { Duration: duration } : undefined;
      await this.vmixManager.sendCommand(productionId, 'Fade', params);

      // Audit Trail
      void this.auditService.log({
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
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to trigger fade: ${message}`);
      throw new BadRequestException(`vMix Error: ${message || 'Unknown'}`);
    }
  }

  async setVolume(productionId: string, input?: number, value?: number) {
    if (value === undefined) throw new BadRequestException('Value is required');
    try {
      if (input === undefined || input === 0 || input === -1) {
        // Master Volume
        await this.vmixManager.sendCommand(productionId, 'SetMasterVolume', {
          Value: value,
        });
      } else {
        // Individual Input Volume
        await this.vmixManager.sendCommand(productionId, 'SetVolume', {
          Input: input,
          Value: value,
        });
      }
      return { success: true, input, value };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to set volume: ${message}`);
      throw new BadRequestException(`vMix Error: ${message || 'Unknown'}`);
    }
  }

  async toggleMute(productionId: string, input?: number) {
    try {
      if (input === undefined || input === 0 || input === -1) {
        // Master Mute Toggle
        await this.vmixManager.sendCommand(productionId, 'MasterAudio');
      } else {
        // Input Mute Toggle
        await this.vmixManager.sendCommand(productionId, 'Audio', {
          Input: input,
        });
      }
      return { success: true, input };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to toggle mute: ${message}`);
      throw new BadRequestException(`vMix Error: ${message || 'Unknown'}`);
    }
  }

  async toggleSolo(productionId: string, input?: number) {
    if (input === undefined)
      return { success: true, message: 'Solo not supported on Master' };
    try {
      // Input Solo Toggle (Master doesn't have Solo in vMix API usually)
      await this.vmixManager.sendCommand(productionId, 'Solo', {
        Input: input,
      });
      return { success: true, input };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to toggle solo: ${message}`);
      throw new BadRequestException(`vMix Error: ${message || 'Unknown'}`);
    }
  }

  async setGain(productionId: string, input?: number, value?: number) {
    if (value === undefined) throw new BadRequestException('Value is required');
    if (input === undefined)
      return { success: true, message: 'Gain not supported on Master' };
    try {
      // Individual Input Gain (Master doesn't have Gain in vMix API SetGain)
      await this.vmixManager.sendCommand(productionId, 'SetGain', {
        Input: input,
        Value: value, // 0-100
      });
      return { success: true, input, value };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to set gain: ${message}`);
      throw new BadRequestException(`vMix Error: ${message || 'Unknown'}`);
    }
  }

  async toggleBus(productionId: string, input?: number, bus?: string) {
    if (!bus) throw new BadRequestException('Bus is required');
    if (input === undefined)
      return { success: true, message: 'Bus routing not supported on Master' };
    try {
      // vMix Command format: AudioBusOn/AudioBusOff or AudioBus (toggle)
      // vMix API uses 'AudioBus' command to toggle a specific bus for an input
      // Value: M,A,B,C,D,E,F,G
      await this.vmixManager.sendCommand(productionId, 'AudioBus', {
        Input: input,
        Value: bus,
      });
      return { success: true, input, bus };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to toggle bus: ${message}`);
      throw new BadRequestException(`vMix Error: ${message || 'Unknown'}`);
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
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to save video delay: ${message}`);
      throw new BadRequestException(`vMix Error: ${message || 'Unknown'}`);
    }
  }

  // Alias for IVideoEngine.saveReplayBuffer
  async saveReplayBuffer(productionId: string) {
    return this.saveVideoDelay(productionId);
  }
}
