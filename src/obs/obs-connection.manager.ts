import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import OBSWebSocket from 'obs-websocket-js';
import { PrismaService } from '@/prisma/prisma.service';
import { EngineType } from '@prisma/client';
import { ObsInstance, ObsScene } from './obs-instance.types';
import { ObsStateStore } from './obs-state.store';
import { ObsEventHandler } from './obs-event-handler';
import { ObsStatsPoller } from './obs-stats-poller';
import { ObsScreenshotPoller } from './obs-screenshot-poller';

// Re-export so existing callers of this module aren't broken
export type { ObsScene } from './obs-instance.types';

@Injectable()
export class ObsConnectionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ObsConnectionManager.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private store: ObsStateStore,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing OBS Connection Manager...');
    await this.loadAllConnections();
  }

  onModuleDestroy() {
    this.logger.log('Destroying OBS Connection Manager...');
    for (const [connectionId, instance] of this.store.entries()) {
      this.teardownInstance(connectionId, instance);
    }
  }

  private async loadAllConnections() {
    const obsConnections = await this.prisma.obsConnection.findMany({
      where: { isEnabled: true },
    });
    for (const config of obsConnections) {
      void this.connectObsById(
        config.id,
        config.productionId,
        config.url,
        config.password || undefined,
        config.isPrimary,
      );
    }
  }

  async connectObsById(
    connectionId: string,
    productionId: string,
    url: string,
    password?: string,
    isPrimary = false,
  ) {
    const existing = this.store.get(connectionId);
    if (existing) {
      const isSameConfig = existing.url === url && existing.password === password;
      if (isSameConfig && (existing.isConnected || existing.reconnectTimeout)) {
        this.logger.debug(
          `OBS already connected or reconnecting for connection ${connectionId}. Skipping.`,
        );
        return;
      }
      this.teardownInstance(connectionId, existing);
    }

    this.store.addToProduction(productionId, connectionId);
    if (isPrimary) this.store.setPrimary(productionId, connectionId);

    const obs = new OBSWebSocket();
    const instance: ObsInstance = {
      obs,
      url,
      password,
      isConnected: false,
      reconnectAttempts: existing?.reconnectAttempts ?? 0,
    };
    this.store.set(connectionId, instance);

    ObsEventHandler.register(
      instance,
      connectionId,
      productionId,
      this.eventEmitter,
      () => this.scheduleReconnect(connectionId, productionId, url, password),
    );

    try {
      await obs.connect(url, password);
      this.logger.log(
        `Successfully connected to OBS for production ${productionId} (${url})`,
      );

      instance.isConnected = true;
      instance.reconnectAttempts = 0;

      if (instance.reconnectTimeout) {
        clearTimeout(instance.reconnectTimeout);
        instance.reconnectTimeout = undefined;
      }

      this.eventEmitter.emit('obs.connection.state', { productionId, connected: true });

      await this.bootstrapInitialState(instance, productionId);

      ObsStatsPoller.start(productionId, instance, this.eventEmitter);
      this.startHeartbeat(productionId, instance);
      ObsScreenshotPoller.start(productionId, instance, this.eventEmitter);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to connect to OBS for production ${productionId} (${url}): ${message}`,
      );
      this.scheduleReconnect(connectionId, productionId, url, password);
    }
  }

  /** Backward-compatible helper: connects/re-connects the primary OBS instance for a production. */
  async connectObs(productionId: string, url: string, password?: string) {
    const conn = await this.prisma.obsConnection.findFirst({
      where: { productionId, isPrimary: true },
    });
    const connectionId = conn?.id ?? productionId;
    return this.connectObsById(connectionId, productionId, url, password, true);
  }

  disconnectObs(productionId: string) {
    for (const connectionId of this.store.getProductionConnectionIds(productionId)) {
      const instance = this.store.get(connectionId);
      if (instance) this.teardownInstance(connectionId, instance);
    }
    this.store.removeProduction(productionId);
    this.store.removePrimary(productionId);
    this.eventEmitter.emit('obs.connection.state', { productionId, connected: false });
  }

  manualReconnect(connectionId: string, productionId: string) {
    const instance = this.store.get(connectionId);
    if (!instance) return;
    instance.reconnectAttempts = 0;
    if (instance.reconnectTimeout) {
      clearTimeout(instance.reconnectTimeout);
      instance.reconnectTimeout = undefined;
    }
    void this.connectObsById(connectionId, productionId, instance.url, instance.password, true);
  }

  // ─── Delegated state queries ─────────────────────────────────────────────

  getInstance(productionId: string): OBSWebSocket | undefined {
    return this.store.getInstance(productionId);
  }

  getObsState(productionId: string) {
    return this.store.getObsState(productionId);
  }

  getConnectionState(connectionId: string) {
    return this.store.getConnectionState(connectionId);
  }

  listConnections(productionId: string) {
    return this.store.listConnections(productionId);
  }

  // ─── Internal lifecycle helpers ──────────────────────────────────────────

  private teardownInstance(connectionId: string, instance: ObsInstance) {
    if (instance.reconnectTimeout) clearTimeout(instance.reconnectTimeout);
    ObsStatsPoller.stop(instance);
    this.stopHeartbeat(instance);
    ObsScreenshotPoller.stop(instance);
    instance.obs.removeAllListeners();
    instance.obs.disconnect().catch(() => {});
    this.store.delete(connectionId);
  }

  private scheduleReconnect(
    connectionId: string,
    productionId: string,
    url: string,
    password?: string,
  ) {
    const instance = this.store.get(connectionId);
    if (!instance) return;

    if (instance.reconnectTimeout) {
      this.logger.debug(
        `Reconnect already scheduled for OBS connection ${connectionId}. Skipping.`,
      );
      return;
    }

    instance.reconnectAttempts++;
    // Exponential backoff, capped at 30s — retries indefinitely
    const delay = Math.min(Math.pow(2, instance.reconnectAttempts) * 1000, 30_000);

    this.logger.warn(
      `Scheduling reconnect attempt ${instance.reconnectAttempts} for OBS connection ${connectionId} (production ${productionId}) in ${delay / 1000}s`,
    );

    instance.reconnectTimeout = setTimeout(() => {
      instance.reconnectTimeout = undefined;
      void this.connectObsById(connectionId, productionId, url, password);
    }, delay);
  }

  private startHeartbeat(productionId: string, instance: ObsInstance) {
    this.stopHeartbeat(instance);
    instance.heartbeatInterval = setInterval(() => {
      void (async () => {
        if (!instance.isConnected) return;
        try {
          await instance.obs.call('GetVersion');
        } catch {
          this.logger.warn(
            `Heartbeat failed for OBS (Production: ${productionId}), marking as disconnected.`,
          );
          instance.isConnected = false;
          instance.obs.disconnect().catch(() => {});
        }
      })();
    }, 10_000);
  }

  private stopHeartbeat(instance: ObsInstance) {
    if (instance.heartbeatInterval) {
      clearInterval(instance.heartbeatInterval);
      instance.heartbeatInterval = undefined;
    }
  }

  private async bootstrapInitialState(
    instance: ObsInstance,
    productionId: string,
  ) {
    try {
      const [
        sceneListRes,
        streamStatusRes,
        recordStatusRes,
        statsRes,
        videoSettingsRes,
        replayBufferStatusRes,
        virtualCamStatusRes,
        sceneCollectionListRes,
        transitionListRes,
        currentTransitionRes,
        studioModeRes,
      ] = await Promise.allSettled([
        instance.obs.call('GetSceneList'),
        instance.obs.call('GetStreamStatus'),
        instance.obs.call('GetRecordStatus'),
        instance.obs.call('GetStats'),
        instance.obs.call('GetVideoSettings'),
        instance.obs.call('GetReplayBufferStatus'),
        instance.obs.call('GetVirtualCamStatus'),
        instance.obs.call('GetSceneCollectionList'),
        instance.obs.call('GetSceneTransitionList'),
        instance.obs.call('GetCurrentSceneTransition'),
        instance.obs.call('GetStudioModeEnabled'),
      ]);

      const sceneList = sceneListRes.status === 'fulfilled' ? sceneListRes.value : undefined;
      const streamStatus = streamStatusRes.status === 'fulfilled' ? streamStatusRes.value : undefined;
      const recordStatus = recordStatusRes.status === 'fulfilled' ? recordStatusRes.value : undefined;
      const stats = statsRes.status === 'fulfilled' ? statsRes.value : undefined;
      const videoSettings = videoSettingsRes.status === 'fulfilled' ? videoSettingsRes.value : undefined;
      const replayBufferStatus = replayBufferStatusRes.status === 'fulfilled' ? replayBufferStatusRes.value : undefined;
      const virtualCamStatus = virtualCamStatusRes.status === 'fulfilled' ? virtualCamStatusRes.value : undefined;
      const sceneCollectionList = sceneCollectionListRes.status === 'fulfilled' ? sceneCollectionListRes.value : undefined;
      const transitionList = transitionListRes.status === 'fulfilled' ? transitionListRes.value : undefined;
      const currentTransition = currentTransitionRes.status === 'fulfilled' ? currentTransitionRes.value : undefined;
      const studioModeState = studioModeRes.status === 'fulfilled' ? studioModeRes.value : undefined;

      const fps = videoSettings
        ? Math.round(videoSettings.fpsNumerator / videoSettings.fpsDenominator)
        : 0;

      let masterVol = 100;
      let masterMuted = false;
      try {
        for (const name of ['Desktop Audio', 'Audio de Escritorio', 'Mic/Aux']) {
          try {
            const vol = await instance.obs.call('GetInputVolume', { inputName: name });
            const mute = await instance.obs.call('GetInputMute', { inputName: name });
            masterVol = Math.round(vol.inputVolumeMul * 100);
            masterMuted = mute.inputMuted;
            break;
          } catch {
            continue;
          }
        }
      } catch {
        /* ignore */
      }

      instance.currentProgramSceneName = sceneList?.currentProgramSceneName || 'Unknown';
      instance.currentPreviewSceneName = sceneList?.currentPreviewSceneName || undefined;

      instance.lastState = {
        currentScene: instance.currentProgramSceneName,
        previewScene: instance.currentPreviewSceneName,
        scenes: sceneList
          ? (sceneList.scenes as unknown as ObsScene[]).map((s) => s.sceneName)
          : [],
        isStreaming: !!streamStatus?.outputActive,
        isRecording: !!recordStatus?.outputActive,
        cpuUsage: stats?.cpuUsage ?? 0,
        fps,
        bitrate: streamStatus?.outputSkippedFrames !== undefined ? 0 : undefined,
        isReplayBufferActive: !!(replayBufferStatus as { outputActive?: boolean } | undefined)?.outputActive,
        isVirtualCamActive: !!(virtualCamStatus as { outputActive?: boolean } | undefined)?.outputActive,
        studioModeEnabled: !!(studioModeState as { studioModeEnabled?: boolean } | undefined)?.studioModeEnabled,
        sceneCollections: ((sceneCollectionList as { sceneCollections?: string[] } | undefined)?.sceneCollections) ?? [],
        currentSceneCollection: ((sceneCollectionList as { currentSceneCollectionName?: string } | undefined)?.currentSceneCollectionName) ?? '',
        transitions: ((transitionList as { transitions?: { transitionName: string }[] } | undefined)?.transitions ?? []).map((t) => t.transitionName),
        currentTransition: ((currentTransition as { transitionName?: string } | undefined)?.transitionName) ?? '',
        tBarPosition: 0,
        audio: {
          master: { volume: masterVol, muted: masterMuted, meterF1: 0, meterF2: 0 },
        },
      };

      if (sceneList?.currentProgramSceneName) {
        this.eventEmitter.emit('obs.scene.changed', {
          productionId,
          sceneName: sceneList.currentProgramSceneName,
          cpuUsage: stats?.cpuUsage,
          fps: fps || undefined,
        });
      }

      if (sceneListRes.status === 'rejected') {
        this.logger.warn(
          `OBS metadata warning (GetSceneList) for production ${productionId}: ${String(sceneListRes.reason)}`,
        );
      }
      if (videoSettingsRes.status === 'rejected') {
        this.logger.warn(
          `OBS metadata warning (GetVideoSettings) for production ${productionId}: ${String(videoSettingsRes.reason)}`,
        );
      }
    } catch (metadataError: unknown) {
      this.logger.warn(
        `OBS metadata bootstrap failed for production ${productionId}, keeping connection alive: ${metadataError instanceof Error ? metadataError.message : String(metadataError)}`,
      );
    }
  }

  @OnEvent('engine.connection.update')
  handleConnectionUpdate(payload: {
    productionId: string;
    type: EngineType;
    url: string;
    password?: string;
  }) {
    if (payload.type === EngineType.OBS) {
      this.logger.log(
        `Received connection update for production ${payload.productionId} (OBS)`,
      );
      void this.connectObs(payload.productionId, payload.url, payload.password);
    }
  }
}
