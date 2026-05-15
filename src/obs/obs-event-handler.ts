import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ObsInstance, ObsScene } from './obs-instance.types';

const ALERT_AFTER_ATTEMPTS = 10;
const MASTER_INPUT_NAMES = ['Desktop Audio', 'Audio de Escritorio', 'Mic/Aux'];

export class ObsEventHandler {
  private static readonly logger = new Logger('ObsEventHandler');

  /**
   * Registers all OBS WebSocket listeners on the given instance.
   * @param onClose Called when the connection closes — typically schedules a reconnect.
   */
  static register(
    instance: ObsInstance,
    connectionId: string,
    productionId: string,
    eventEmitter: EventEmitter2,
    onClose: () => void,
  ): void {
    const { obs } = instance;

    obs.on('ConnectionClosed', (error) => {
      ObsEventHandler.logger.warn(
        `OBS connection closed [conn=${connectionId}] production ${productionId}: ${error?.message || 'Unknown'} | code=${error?.code ?? 'n/a'}`,
      );
      instance.isConnected = false;
      eventEmitter.emit('obs.connection.state', { productionId, connected: false });
      onClose();
      if (instance.reconnectAttempts >= ALERT_AFTER_ATTEMPTS) {
        eventEmitter.emit('obs.connection.alert', {
          productionId,
          connectionId,
          attempts: instance.reconnectAttempts,
          wasStreaming: instance.lastState?.isStreaming ?? false,
        });
      }
    });

    obs.on('ConnectionError', (error) => {
      ObsEventHandler.logger.error(
        `OBS connection error for production ${productionId} (${instance.url})`,
        error,
      );
    });

    obs.on('CurrentProgramSceneChanged', (data) => {
      instance.currentProgramSceneName = data.sceneName;
      if (instance.lastState) instance.lastState.currentScene = data.sceneName;
      eventEmitter.emit('obs.scene.changed', {
        productionId,
        programScene: data.sceneName,
        previewScene: instance.currentPreviewSceneName,
      });
    });

    obs.on('CurrentPreviewSceneChanged', (data) => {
      instance.currentPreviewSceneName = data.sceneName || undefined;
      if (instance.lastState) instance.lastState.previewScene = data.sceneName || undefined;
      eventEmitter.emit('obs.scene.changed', {
        productionId,
        programScene: instance.currentProgramSceneName,
        previewScene: data.sceneName || undefined,
      });
    });

    obs.on(
      'StreamStateChanged',
      (data: { outputActive: boolean; outputState: string }) => {
        if (instance.lastState) instance.lastState.isStreaming = data.outputActive;
        eventEmitter.emit('obs.stream.state', {
          productionId,
          active: data.outputActive,
          state: data.outputState,
        });
      },
    );

    obs.on(
      'InputVolumeChanged',
      (data: { inputName: string; inputVolumeMul: number; inputVolumeDb: number }) => {
        if (
          MASTER_INPUT_NAMES.includes(data.inputName) &&
          instance.lastState?.audio?.master
        ) {
          instance.lastState.audio.master.volume = Math.round(data.inputVolumeMul * 100);
        }
        eventEmitter.emit('obs.audio.volume', {
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
          MASTER_INPUT_NAMES.includes(data.inputName) &&
          instance.lastState?.audio?.master
        ) {
          instance.lastState.audio.master.muted = data.inputMuted;
        }
        eventEmitter.emit('obs.audio.mute', {
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
        const masterMeter = data.inputs.find((i) =>
          MASTER_INPUT_NAMES.includes(i.inputName),
        );
        if (masterMeter && instance.lastState?.audio?.master) {
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
        if (instance.lastState) instance.lastState.isRecording = data.outputActive;
        eventEmitter.emit('obs.record.state', {
          productionId,
          active: data.outputActive,
          state: data.outputState,
        });
      },
    );

    obs.on(
      'ReplayBufferStateChanged',
      (data: { outputActive: boolean; outputState: string }) => {
        if (instance.lastState) instance.lastState.isReplayBufferActive = data.outputActive;
        eventEmitter.emit('obs.replaybuffer.state', {
          productionId,
          active: data.outputActive,
          state: data.outputState,
        });
      },
    );

    obs.on(
      'VirtualcamStateChanged',
      (data: { outputActive: boolean; outputState: string }) => {
        if (instance.lastState) instance.lastState.isVirtualCamActive = data.outputActive;
        eventEmitter.emit('obs.virtualcam.state', {
          productionId,
          active: data.outputActive,
          state: data.outputState,
        });
      },
    );

    obs.on(
      'CurrentSceneCollectionChanged',
      (data: { sceneCollectionName: string }) => {
        if (instance.lastState)
          instance.lastState.currentSceneCollection = data.sceneCollectionName;
        eventEmitter.emit('obs.scenecollection.changed', {
          productionId,
          sceneCollectionName: data.sceneCollectionName,
        });
      },
    );

    obs.on('SceneCollectionListChanged', (data: { sceneCollections: string[] }) => {
      if (instance.lastState) instance.lastState.sceneCollections = data.sceneCollections;
    });

    obs.on(
      'CurrentSceneTransitionChanged',
      (data: { transitionName: string }) => {
        if (instance.lastState) instance.lastState.currentTransition = data.transitionName;
        eventEmitter.emit('obs.transition.changed', {
          productionId,
          transitionName: data.transitionName,
        });
      },
    );

    obs.on('StudioModeStateChanged', (data: { studioModeEnabled: boolean }) => {
      if (instance.lastState) instance.lastState.studioModeEnabled = data.studioModeEnabled;
      eventEmitter.emit('obs.studiomode.changed', {
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
          eventEmitter.emit('obs.scene.changed', {
            productionId,
            sceneName: sceneList.currentProgramSceneName,
          });
        } catch (e: unknown) {
          ObsEventHandler.logger.error(
            `Failed to refresh scene list for production ${productionId}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      })();
    });
  }
}
