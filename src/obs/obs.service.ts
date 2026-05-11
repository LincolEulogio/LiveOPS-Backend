import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ObsConnectionManager } from '@/obs/obs-connection.manager';
import { SaveObsConnectionDto, CreateObsConnectionDto } from '@/obs/dto/obs.dto';
import { AuditService, AuditAction } from '@/common/services/audit.service';
import { FieldCipherService } from '@/common/crypto/field-cipher.service';
import { formatEngineUrl } from '@/common/utils/engine-url.util';
import { ISceneEngine } from '@/streaming/interfaces/video-engine.interface';

@Injectable()
export class ObsService implements ISceneEngine {
  private readonly logger = new Logger(ObsService.name);

  constructor(
    private prisma: PrismaService,
    private obsManager: ObsConnectionManager,
    private auditService: AuditService,
    private cipher: FieldCipherService,
  ) {}

  // ─── Connection management ────────────────────────────────────────────────

  async saveConnection(productionId: string, dto: SaveObsConnectionDto) {
    const url = formatEngineUrl(dto, 'ws', '4455');
    const encryptedPassword = dto.password ? this.cipher.encrypt(dto.password) : null;

    const connection = await this.prisma.obsConnection.upsert({
      where: { productionId_name: { productionId, name: 'default' } },
      update: {
        url,
        password: encryptedPassword,
        isEnabled: dto.isEnabled ?? true,
        isPrimary: true,
      },
      create: {
        productionId,
        name: 'default',
        isPrimary: true,
        url,
        password: encryptedPassword,
        isEnabled: dto.isEnabled ?? true,
      },
    });

    if (connection.isEnabled) {
      void this.obsManager.connectObsById(
        connection.id,
        productionId,
        connection.url,
        dto.password || undefined,
        true,
      );
    } else {
      this.obsManager.disconnectObs(productionId);
    }

    return this.maskConnection(connection);
  }

  async getConnection(productionId: string) {
    const conn = await this.prisma.obsConnection.findFirst({
      where: { productionId, isPrimary: true },
    });
    if (!conn) throw new NotFoundException('OBS Connection not configured for this production');
    return this.maskConnection(conn);
  }

  // ─── Multi-instance ───────────────────────────────────────────────────────

  async addConnection(productionId: string, dto: CreateObsConnectionDto) {
    const url = formatEngineUrl(dto, 'ws', '4455');
    const encryptedPassword = dto.password ? this.cipher.encrypt(dto.password) : null;

    const existing = await this.prisma.obsConnection.count({ where: { productionId } });
    const isPrimary = dto.isPrimary ?? existing === 0;

    if (isPrimary) {
      await this.prisma.obsConnection.updateMany({
        where: { productionId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const connection = await this.prisma.obsConnection.create({
      data: {
        productionId,
        name: dto.name,
        isPrimary,
        url,
        password: encryptedPassword,
        isEnabled: dto.isEnabled ?? true,
      },
    });

    if (connection.isEnabled) {
      void this.obsManager.connectObsById(
        connection.id,
        productionId,
        connection.url,
        dto.password || undefined,
        isPrimary,
      );
    }

    return this.maskConnection(connection);
  }

  async listConnections(productionId: string) {
    const conns = await this.prisma.obsConnection.findMany({
      where: { productionId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    const runtimeInfo = this.obsManager.listConnections(productionId);
    return conns.map((c) => ({
      ...this.maskConnection(c),
      isConnected: runtimeInfo.find((r) => r.connectionId === c.id)?.isConnected ?? false,
    }));
  }

  async removeConnection(productionId: string, connectionId: string) {
    const conn = await this.prisma.obsConnection.findFirst({
      where: { id: connectionId, productionId },
    });
    if (!conn) throw new NotFoundException('OBS Connection not found');

    await this.prisma.obsConnection.delete({ where: { id: connectionId } });
    this.obsManager.disconnectObs(productionId); // will only remove specific connection via productionMap

    // If it was primary, promote the next available
    if (conn.isPrimary) {
      const next = await this.prisma.obsConnection.findFirst({ where: { productionId } });
      if (next) await this.prisma.obsConnection.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
    return { success: true };
  }

  async reconnect(productionId: string, connectionId?: string) {
    if (connectionId) {
      const conn = await this.prisma.obsConnection.findFirst({
        where: { id: connectionId, productionId },
      });
      if (!conn) throw new NotFoundException('OBS Connection not found');
      const password = conn.password && this.cipher.isEncrypted(conn.password)
        ? this.cipher.decrypt(conn.password)
        : conn.password ?? undefined;
      this.obsManager.manualReconnect(conn.id, productionId);
      // Re-pass decrypted password for the reconnect
      void this.obsManager.connectObsById(conn.id, productionId, conn.url, password, conn.isPrimary);
    } else {
      const conn = await this.prisma.obsConnection.findFirst({
        where: { productionId, isPrimary: true },
      });
      if (!conn) throw new NotFoundException('No primary OBS connection configured');
      const password = conn.password && this.cipher.isEncrypted(conn.password)
        ? this.cipher.decrypt(conn.password)
        : conn.password ?? undefined;
      this.obsManager.manualReconnect(conn.id, productionId);
    }
    return { success: true };
  }

  getMonitorState(productionId: string) {
    return this.obsManager.getObsState(productionId);
  }

  // ─── ISceneEngine ─────────────────────────────────────────────────────────

  isConnected(productionId: string): boolean {
    return this.obsManager.getObsState(productionId).isConnected;
  }

  getRealTimeState(productionId: string) {
    return Promise.resolve(this.obsManager.getObsState(productionId));
  }

  // ─── OBS Commands ─────────────────────────────────────────────────────────

  private getObs(productionId: string) {
    const obs = this.obsManager.getInstance(productionId);
    if (!obs) {
      throw new BadRequestException('OBS is not connected or configured for this production');
    }
    return obs;
  }

  async changeScene(productionId: string, sceneName: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('SetCurrentProgramScene', { sceneName });
      void this.auditService.log({ productionId, action: AuditAction.SCENE_CHANGE, details: { sceneName } });
      return { success: true, sceneName };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to change scene: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async setPreviewScene(productionId: string, sceneName: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('SetCurrentPreviewScene', { sceneName });
      return { success: true, sceneName };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to set preview scene: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async startStream(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StartStream');
      void this.auditService.log({ productionId, action: AuditAction.STREAM_START });
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to start stream: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async startStreamToDestination(productionId: string, rtmpUrl: string, streamKey: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('SetStreamServiceSettings', {
        streamServiceType: 'rtmp_custom',
        streamServiceSettings: { server: rtmpUrl, key: streamKey },
      });
      await obs.call('StartStream');
      void this.auditService.log({ productionId, action: AuditAction.STREAM_START });
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to start stream to destination: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async stopStreamFromDestination(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StopStream');
      void this.auditService.log({ productionId, action: AuditAction.STREAM_STOP });
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Failed to stop stream: ${message}`);
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async stopStream(productionId: string) {
    const obs = this.getObs(productionId);
    try {
      await obs.call('StopStream');
      void this.auditService.log({ productionId, action: AuditAction.STREAM_STOP });
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
      void this.auditService.log({ productionId, action: AuditAction.RECORD_START });
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
      void this.auditService.log({ productionId, action: AuditAction.RECORD_STOP });
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
      throw new BadRequestException(`OBS Error: ${message}`);
    }
  }

  async setVolume(productionId: string, input?: string | number, value?: number) {
    const obs = this.getObs(productionId);
    try {
      let inputName = typeof input === 'string' ? input : '';
      if (!inputName || input === 0 || input === -1) {
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
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.warn(`Failed to set OBS volume for ${input}: ${message}`);
      return { success: true };
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

  toggleSolo(productionId: string, input?: string | number): Promise<{ success: boolean }> {
    this.logger.debug(`toggleSolo (OBS) - Production: ${productionId}, Input: ${input}`);
    return Promise.resolve({ success: true });
  }

  setGain(productionId: string, input?: string | number, value?: number): Promise<{ success: boolean }> {
    this.logger.debug(`setGain (OBS) - Production: ${productionId}, Input: ${input}, Value: ${value}`);
    return Promise.resolve({ success: true });
  }

  toggleBus(productionId: string, input?: string | number, bus?: string): Promise<{ success: boolean }> {
    this.logger.debug(`toggleBus (OBS) - Production: ${productionId}, Input: ${input}, Bus: ${bus}`);
    return Promise.resolve({ success: true });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private maskConnection<T extends { password?: string | null }>(conn: T): Omit<T, 'password'> & { password: null } {
    // Never return the encrypted password to the client
    const { password: _pw, ...rest } = conn;
    return { ...rest, password: null } as Omit<T, 'password'> & { password: null };
  }
}
