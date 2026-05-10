import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import OBSWebSocket from 'obs-websocket-js';
import { PrismaService } from '@/prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';
import { EngineType } from '@prisma/client';

import { ProductionHealthStats } from '@/streaming/streaming.types';

export interface ObsScene {
  sceneName: string;
  sceneIndex: number;
}

interface ObsInstance {
  obs: OBSWebSocket;
  url: string;
  password?: string;
  reconnectTimeout?: NodeJS.Timeout;
  statsInterval?: NodeJS.Timeout;
  heartbeatInterval?: NodeJS.Timeout;
  screenshotInterval?: NodeJS.Timeout;
  isConnected: boolean;
  reconnectAttempts: number;
  currentProgramSceneName?: string;
  currentPreviewSceneName?: string;
  lastState?: {
    currentScene: string;
    previewScene?: string;
    scenes: string[];
    isStreaming: boolean;
    isRecording: boolean;
    cpuUsage: number;
    fps: number;
    bitrate?: number;
    outputSkippedFrames?: number;
    outputTotalFrames?: number;
    isReplayBufferActive: boolean;
    isVirtualCamActive: boolean;
    studioModeEnabled: boolean;
    sceneCollections: string[];
    currentSceneCollection: string;
    transitions: string[];
    currentTransition: string;
    tBarPosition: number;
    audio?: {
      master?: {
        volume: number;
        muted: boolean;
        meterF1: number;
        meterF2: number;
      };
    };
  };
}

@Injectable()
export class ObsConnectionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ObsConnectionManager.name);
  private readonly MAX_RECONNECT_ATTEMPTS = 50;
  private connections = new Map<string, ObsInstance>();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing OBS Connection Manager...');
    await this.loadAllConnections();
  }

  onModuleDestroy() {
    this.logger.log('Destroying OBS Connection Manager...');
    for (const [productionId, instance] of this.connections.entries()) {
      this.disconnectInstance(productionId, instance);
    }
  }

  private async loadAllConnections() {
    const obsConnections = await this.prisma.obsConnection.findMany({
      where: { isEnabled: true },
    });

    for (const config of obsConnections) {
      void this.connectObs(
        config.productionId,
        config.url,
        config.password || undefined,
      );
    }
  }

  async connectObs(productionId: string, url: string, password?: string) {
    const existing = this.connections.get(productionId);
    if (existing) {
      const isSameConfig =
        existing.url === url && existing.password === password;
      if (isSameConfig && (existing.isConnected || existing.reconnectTimeout)) {
        this.logger.debug(
          `OBS already connected or reconnecting with same config for ${productionId}. Skipping.`,
        );
        return;
      }
      this.disconnectInstance(productionId, existing);
    }

    const obs = new OBSWebSocket();
    const instance: ObsInstance = {
      obs,
      url,
      password,
      isConnected: false,
      reconnectAttempts: existing?.reconnectAttempts || 0,
    };
    this.connections.set(productionId, instance);

    obs.on('ConnectionClosed', (error) => {
      this.logger.warn(
        `OBS connection closed for production ${productionId}: ${error?.message || 'Unknown'} | code=${error?.code ?? 'n/a'}`,
      );
      instance.isConnected = false;
      this.scheduleReconnect(productionId, url, password);

      if (instance.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        this.eventEmitter.emit('obs.connection.state', {
          productionId,
          connected: false,
        });
      }
    });

    obs.on('ConnectionError', (error) => {
      this.logger.error(
        `OBS connection error for production ${productionId} (${url})`,
        error,
      );
    });

    obs.on('CurrentProgramSceneChanged', (data) => {
      if (instance.lastState) {
        instance.lastState.currentScene = data.sceneName;
      }
      this.eventEmitter.emit('obs.scene.changed', {
        productionId,
        programScene: data.sceneName,
        previewScene: instance.currentPreviewSceneName,
      });
    });

    obs.on('CurrentPreviewSceneChanged', (data) => {
      instance.currentPreviewSceneName = data.sceneName || undefined;
      if (instance.lastState) {
        instance.lastState.previewScene = data.sceneName || undefined;
      }
      this.eventEmitter.emit('obs.scene.changed', {
        productionId,
        programScene: instance.currentProgramSceneName,
        previewScene: data.sceneName || undefined,
      });
    });

    obs.on(
      'StreamStateChanged',
      (data: { outputActive: boolean; outputState: string }) => {
        if (instance.lastState) {
          instance.lastState.isStreaming = data.outputActive;
        }
        this.eventEmitter.emit('obs.stream.state', {
          productionId,
          active: data.outputActive,
          state: data.outputState,
        });
      },
    );

    obs.on(
      'InputVolumeChanged',
      (data: {
        inputName: string;
        inputVolumeMul: number;
        inputVolumeDb: number;
      }) => {
        if (
          (data.inputName === 'Desktop Audio' ||
            data.inputName === 'Audio de Escritorio' ||
            data.inputName === 'Mic/Aux') &&
          instance.lastState?.audio?.master
        ) {
          instance.lastState.audio.master.volume = Math.round(
            data.inputVolumeMul * 100,
          );
        }
        this.eventEmitter.emit('obs.audio.volume', {
          productionId,
          inputName: data.inputName,
          volumeMul: data.inputVolumeMul,
          volumeDb: data.inputVolumeDb,
        });
      },
    );

    obs.on(
      'InputMuteStateChanged',
      (data: { inputName: string; inputMuted: boolean }) => {
        if (
          (data.inputName === 'Desktop Audio' ||
            data.inputName === 'Audio de Escritorio' ||
            data.inputName === 'Mic/Aux') &&
          instance.lastState?.audio?.master
        ) {
          instance.lastState.audio.master.muted = data.inputMuted;
        }
        this.eventEmitter.emit('obs.audio.mute', {
          productionId,
          inputName: data.inputName,
          muted: data.inputMuted,
        });
      },
    );

    obs.on(
      'InputVolumeMeters',
      (data: {
        inputs: {
          inputName: string;
          inputLevelsMul: number[][];
          inputLevelsDb: number[][];
        }[];
      }) => {
        const masterMeter = data.inputs.find(
          (i) =>
            i.inputName === 'Desktop Audio' ||
            i.inputName === 'Audio de Escritorio' ||
            i.inputName === 'Mic/Aux',
        );

        if (masterMeter && instance.lastState?.audio?.master) {
          // OBS returns levels as linear multiplier (0 to 1)
          // [0][0] is usually Left channel, [0][1] is Right channel peak
          instance.lastState.audio.master.meterF1 =
            masterMeter.inputLevelsMul?.[0]?.[0] ?? 0;
          instance.lastState.audio.master.meterF2 =
            masterMeter.inputLevelsMul?.[1]?.[0] ??
            masterMeter.inputLevelsMul?.[0]?.[1] ??
            0;
        }
      },
    );

    obs.on(
      'RecordStateChanged',
      (data: { outputActive: boolean; outputState: string }) => {
        if (instance.lastState) {
          instance.lastState.isRecording = data.outputActive;
        }
        this.eventEmitter.emit('obs.record.state', {
          productionId,
          active: data.outputActive,
          state: data.outputState,
        });
      },
    );

    obs.on(
      'ReplayBufferStateChanged',
      (data: { outputActive: boolean; outputState: string }) => {
        if (instance.lastState) {
          instance.lastState.isReplayBufferActive = data.outputActive;
        }
        this.eventEmitter.emit('obs.replaybuffer.state', {
          productionId,
          active: data.outputActive,
          state: data.outputState,
        });
      },
    );

    obs.on(
      'VirtualcamStateChanged',
      (data: { outputActive: boolean; outputState: string }) => {
        if (instance.lastState) {
          instance.lastState.isVirtualCamActive = data.outputActive;
        }
        this.eventEmitter.emit('obs.virtualcam.state', {
          productionId,
          active: data.outputActive,
          state: data.outputState,
        });
      },
    );

    obs.on('CurrentSceneCollectionChanged', (data: { sceneCollectionName: string }) => {
      if (instance.lastState) {
        instance.lastState.currentSceneCollection = data.sceneCollectionName;
      }
      this.eventEmitter.emit('obs.scenecollection.changed', {
        productionId,
        sceneCollectionName: data.sceneCollectionName,
      });
    });

    obs.on('SceneCollectionListChanged', (data: { sceneCollections: string[] }) => {
      if (instance.lastState) {
        instance.lastState.sceneCollections = data.sceneCollections;
      }
    });

    obs.on('CurrentSceneTransitionChanged', (data: { transitionName: string }) => {
      if (instance.lastState) {
        instance.lastState.currentTransition = data.transitionName;
      }
      this.eventEmitter.emit('obs.transition.changed', {
        productionId,
        transitionName: data.transitionName,
      });
    });

    obs.on('StudioModeStateChanged', (data: { studioModeEnabled: boolean }) => {
      if (instance.lastState) {
        instance.lastState.studioModeEnabled = data.studioModeEnabled;
      }
      this.eventEmitter.emit('obs.studiomode.changed', {
        productionId,
        studioModeEnabled: data.studioModeEnabled,
      });
    });

    obs.on('SceneListChanged', () => {
      void (async () => {
        try {
          const sceneList = await obs.call('GetSceneList');
          if (instance.lastState) {
            instance.lastState.scenes = (
              sceneList.scenes as unknown as ObsScene[]
            ).map((s) => s.sceneName);
            instance.lastState.currentScene = sceneList.currentProgramSceneName;
          }
          this.eventEmitter.emit('obs.scene.changed', {
            productionId,
            sceneName: sceneList.currentProgramSceneName,
          });
        } catch (e: unknown) {
          this.logger.error(
            `Failed to refresh scene list for production ${productionId}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      })();
    });

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
      this.eventEmitter.emit('obs.connection.state', {
        productionId,
        connected: true,
      });

      this.startStatsPolling(productionId, instance);
      this.startHeartbeat(productionId, instance);
      this.startScreenshotPolling(productionId, instance);

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
          currentSceneCollectionRes,
          transitionListRes,
          currentTransitionRes,
          studioModeRes,
        ] = await Promise.allSettled([
          obs.call('GetSceneList'),
          obs.call('GetStreamStatus'),
          obs.call('GetRecordStatus'),
          obs.call('GetStats'),
          obs.call('GetVideoSettings'),
          obs.call('GetReplayBufferStatus'),
          obs.call('GetVirtualCamStatus'),
          obs.call('GetSceneCollectionList'),
          obs.call('GetSceneCollectionList'),
          obs.call('GetSceneTransitionList'),
          obs.call('GetCurrentSceneTransition'),
          obs.call('GetStudioModeEnabled'),
        ]);

        const sceneList =
          sceneListRes.status === 'fulfilled' ? sceneListRes.value : undefined;
        const streamStatus =
          streamStatusRes.status === 'fulfilled'
            ? streamStatusRes.value
            : undefined;
        const recordStatus =
          recordStatusRes.status === 'fulfilled'
            ? recordStatusRes.value
            : undefined;
        const stats =
          statsRes.status === 'fulfilled' ? statsRes.value : undefined;
        const videoSettings =
          videoSettingsRes.status === 'fulfilled'
            ? videoSettingsRes.value
            : undefined;
        const replayBufferStatus =
          replayBufferStatusRes.status === 'fulfilled'
            ? replayBufferStatusRes.value
            : undefined;
        const virtualCamStatus =
          virtualCamStatusRes.status === 'fulfilled'
            ? virtualCamStatusRes.value
            : undefined;
        const sceneCollectionList =
          sceneCollectionListRes.status === 'fulfilled'
            ? sceneCollectionListRes.value
            : undefined;
        const currentSceneCollection =
          currentSceneCollectionRes.status === 'fulfilled'
            ? currentSceneCollectionRes.value
            : undefined;
        const transitionList =
          transitionListRes.status === 'fulfilled'
            ? transitionListRes.value
            : undefined;
        const currentTransition =
          currentTransitionRes.status === 'fulfilled'
            ? currentTransitionRes.value
            : undefined;
        const studioModeState =
          studioModeRes.status === 'fulfilled' ? studioModeRes.value : undefined;

        const fps = videoSettings
          ? Math.round(
              videoSettings.fpsNumerator / videoSettings.fpsDenominator,
            )
          : 0;

        // Attempt to get initial audio state for 'Master'
        let masterVol = 100;
        let masterMuted = false;
        try {
          // Try English and Spanish defaults
          const names = ['Desktop Audio', 'Audio de Escritorio', 'Mic/Aux'];
          for (const name of names) {
            try {
              const vol = await obs.call('GetInputVolume', { inputName: name });
              const mute = await obs.call('GetInputMute', { inputName: name });
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

        instance.currentProgramSceneName =
          sceneList?.currentProgramSceneName || 'Unknown';
        instance.currentPreviewSceneName =
          sceneList?.currentPreviewSceneName || undefined;

        instance.lastState = {
          currentScene: instance.currentProgramSceneName,
          previewScene: instance.currentPreviewSceneName,
          scenes: sceneList
            ? (sceneList.scenes as unknown as ObsScene[]).map(
                (s) => s.sceneName,
              )
            : [],
          isStreaming: !!streamStatus?.outputActive,
          isRecording: !!recordStatus?.outputActive,
          cpuUsage: stats?.cpuUsage ?? 0,
          fps,
          bitrate:
            streamStatus?.outputSkippedFrames !== undefined ? 0 : undefined,
          isReplayBufferActive: !!(replayBufferStatus as { outputActive?: boolean } | undefined)?.outputActive,
          isVirtualCamActive: !!(virtualCamStatus as { outputActive?: boolean } | undefined)?.outputActive,
          studioModeEnabled: !!(studioModeState as { studioModeEnabled?: boolean } | undefined)?.studioModeEnabled,
          sceneCollections: ((sceneCollectionList as { sceneCollections?: string[] } | undefined)?.sceneCollections) ?? [],
          currentSceneCollection: ((currentSceneCollection as { currentSceneCollectionName?: string } | undefined)?.currentSceneCollectionName) ?? '',
          transitions: ((transitionList as { transitions?: { transitionName: string }[] } | undefined)?.transitions ?? []).map((t) => t.transitionName),
          currentTransition: ((currentTransition as { transitionName?: string } | undefined)?.transitionName) ?? '',
          tBarPosition: 0,
          audio: {
            master: {
              volume: masterVol,
              muted: masterMuted,
              meterF1: 0,
              meterF2: 0,
            },
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to connect to OBS for production ${productionId} (${url}): ${message}`,
      );
      this.scheduleReconnect(productionId, url, password);
    }
  }

  private disconnectInstance(productionId: string, instance: ObsInstance) {
    if (instance.reconnectTimeout) {
      clearTimeout(instance.reconnectTimeout);
    }
    this.stopStatsPolling(instance);
    this.stopHeartbeat(instance);
    this.stopScreenshotPolling(instance);
    instance.obs.removeAllListeners();
    instance.obs.disconnect().catch(() => {});
    this.connections.delete(productionId);
    this.eventEmitter.emit('obs.connection.state', {
      productionId,
      connected: false,
    });
  }

  disconnectObs(productionId: string) {
    const instance = this.connections.get(productionId);
    if (instance) {
      this.disconnectInstance(productionId, instance);
    }
  }

  private scheduleReconnect(
    productionId: string,
    url: string,
    password?: string,
  ) {
    const instance = this.connections.get(productionId);
    if (!instance) return;

    if (instance.reconnectTimeout) {
      this.logger.debug(
        `Reconnect already scheduled for OBS (Production: ${productionId}). Skipping duplicate schedule.`,
      );
      return;
    }

    instance.reconnectAttempts++;
    if (instance.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error(
        `MAX_RECONNECT_ATTEMPTS reached for OBS (Production: ${productionId}). Stopping auto-reconnect.`,
      );
      return;
    }

    const delay = Math.min(
      Math.pow(2, instance.reconnectAttempts) * 1000,
      30000,
    );

    this.logger.warn(
      `Scheduling reconnect attempt ${instance.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} for OBS (Production: ${productionId}) in ${delay / 1000}s`,
    );

    instance.reconnectTimeout = setTimeout(() => {
      instance.reconnectTimeout = undefined;
      void this.connectObs(productionId, url, password);
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
    }, 10000);
  }

  private stopHeartbeat(instance: ObsInstance) {
    if (instance.heartbeatInterval) {
      clearInterval(instance.heartbeatInterval);
      instance.heartbeatInterval = undefined;
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

  private startStatsPolling(productionId: string, instance: ObsInstance) {
    this.stopStatsPolling(instance);
    this.logger.log(
      `Starting Technical Stats Polling for production ${productionId} (OBS)`,
    );

    instance.statsInterval = setInterval(() => {
      void (async () => {
        try {
          if (!instance.isConnected) return;
          const [stats, streamStatus] = await Promise.all([
            instance.obs.call('GetStats'),
            instance.obs.call('GetStreamStatus'),
          ]);

          if (instance.lastState) {
            instance.lastState.cpuUsage = stats.cpuUsage;
            instance.lastState.outputSkippedFrames =
              streamStatus.outputSkippedFrames;
            instance.lastState.outputTotalFrames =
              streamStatus.outputTotalFrames;
          }

          const recordStatus = await instance.obs.call('GetRecordStatus');

          const healthStats: ProductionHealthStats = {
            productionId,
            engineType: EngineType.OBS,
            cpuUsage: stats.cpuUsage,
            fps: stats.activeFps,
            bitrate: streamStatus.outputActive ? 5500 : 0,
            skippedFrames: streamStatus.outputSkippedFrames || 0,
            totalFrames: streamStatus.outputTotalFrames || 0,
            memoryUsage: stats.memoryUsage,
            availableDiskSpace: stats.availableDiskSpace,
            isStreaming: streamStatus.outputActive,
            isRecording: recordStatus.outputActive,
            timestamp: new Date().toISOString(),
          };

          this.eventEmitter.emit('production.health.stats', healthStats);
        } catch (e: unknown) {
          this.logger.error(
            `Error polling OBS stats for ${productionId}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      })();
    }, 2000);
  }

  private stopStatsPolling(instance: ObsInstance) {
    if (instance.statsInterval) {
      clearInterval(instance.statsInterval);
      instance.statsInterval = undefined;
    }
  }

  getInstance(productionId: string): OBSWebSocket | undefined {
    const instance = this.connections.get(productionId);
    return instance?.isConnected ? instance.obs : undefined;
  }

  getObsState(productionId: string) {
    const instance = this.connections.get(productionId);
    if (!instance) return { isConnected: false };

    return {
      isConnected: instance.isConnected,
      ...instance.lastState,
    };
  }

  private startScreenshotPolling(productionId: string, instance: ObsInstance) {
    this.stopScreenshotPolling(instance);

    const poll = async () => {
      if (!instance.isConnected) return;

      try {
        const programScene = instance.currentProgramSceneName;
        const previewScene = instance.currentPreviewSceneName;

        const screenshotOptions = {
          imageFormat: 'jpeg',
          imageWidth: 1280,
          imageHeight: 720,
          imageCompressionQuality: 80,
        };

        const requests: Promise<{ imageData: string }>[] = [];
        if (programScene) {
          requests.push(
            instance.obs.call('GetSourceScreenshot', {
              sourceName: programScene,
              ...screenshotOptions,
            }) as Promise<{ imageData: string }>,
          );
        }
        if (previewScene && previewScene !== programScene) {
          requests.push(
            instance.obs.call('GetSourceScreenshot', {
              sourceName: previewScene,
              ...screenshotOptions,
            }) as Promise<{ imageData: string }>,
          );
        }

        const results = await Promise.allSettled(requests);

        const payload: {
          productionId: string;
          programScene: string;
          previewScene?: string;
          program?: string;
          preview?: string;
        } = {
          productionId,
          programScene: programScene ?? '',
          previewScene: previewScene ?? undefined,
        };

        if (results[0]?.status === 'fulfilled') {
          const data = results[0].value.imageData;
          payload.program = data.startsWith('data:')
            ? data
            : `data:image/jpeg;base64,${data}`;
        }

        if (results[1] && results[1].status === 'fulfilled') {
          const data = (
            results[1] as PromiseFulfilledResult<{ imageData: string }>
          ).value.imageData;
          payload.preview = data.startsWith('data:')
            ? data
            : `data:image/jpeg;base64,${data}`;
        } else if (!previewScene && payload.program) {
          payload.preview = payload.program;
        } else if (previewScene === programScene && payload.program) {
          payload.preview = payload.program;
        }

        if (payload.program || payload.preview) {
          this.eventEmitter.emit('obs.screenshot.update', payload);
        }
      } catch {
        // Silent error for screenshots to avoid spamming logs
      } finally {
        // Schedule next poll if still connected
        if (instance.isConnected) {
          instance.screenshotInterval = setTimeout(() => {
            void poll();
          }, 33);
        }
      }
    };

    // Start first poll
    instance.screenshotInterval = setTimeout(() => {
      void poll();
    }, 33);
  }

  private stopScreenshotPolling(instance: ObsInstance) {
    if (instance.screenshotInterval) {
      clearTimeout(instance.screenshotInterval);
      instance.screenshotInterval = undefined;
    }
  }
}
