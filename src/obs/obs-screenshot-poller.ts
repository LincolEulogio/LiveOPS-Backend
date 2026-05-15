import { EventEmitter2 } from '@nestjs/event-emitter';
import { ObsInstance } from './obs-instance.types';

const THUMB_EVERY_N_TICKS = 5;

export class ObsScreenshotPoller {
  static start(
    productionId: string,
    instance: ObsInstance,
    eventEmitter: EventEmitter2,
  ): void {
    ObsScreenshotPoller.stop(instance);

    let thumbRoundRobinIdx = 0;
    let tickCount = 0;

    const poll = async () => {
      if (!instance.isConnected) return;

      try {
        const programScene = instance.currentProgramSceneName;
        const previewScene = instance.currentPreviewSceneName;
        tickCount++;

        const hiResOptions = {
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
              ...hiResOptions,
            }) as Promise<{ imageData: string }>,
          );
        }
        if (previewScene && previewScene !== programScene) {
          requests.push(
            instance.obs.call('GetSourceScreenshot', {
              sourceName: previewScene,
              ...hiResOptions,
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
          eventEmitter.emit('obs.screenshot.update', payload);
        }

        if (tickCount % THUMB_EVERY_N_TICKS === 0) {
          const scenes = instance.lastState?.scenes ?? [];
          const inactive = scenes.filter(
            (s) => s !== programScene && s !== previewScene,
          );
          if (inactive.length > 0) {
            const scene = inactive[thumbRoundRobinIdx % inactive.length];
            thumbRoundRobinIdx++;
            try {
              const res = (await instance.obs.call('GetSourceScreenshot', {
                sourceName: scene,
                imageFormat: 'jpeg',
                imageWidth: 320,
                imageHeight: 180,
                imageCompressionQuality: 60,
              })) as { imageData: string };
              const data = res.imageData;
              const url = data.startsWith('data:')
                ? data
                : `data:image/jpeg;base64,${data}`;
              eventEmitter.emit('obs.scene.thumbnails', {
                productionId,
                thumbnails: { [scene]: url },
              });
            } catch {
              // Scene unavailable — skip silently
            }
          }
        }
      } catch {
        // Silent — avoid spamming logs during brief disconnects
      } finally {
        if (instance.isConnected) {
          instance.screenshotInterval = setTimeout(() => void poll(), 33);
        }
      }
    };

    instance.screenshotInterval = setTimeout(() => void poll(), 33);
  }

  static stop(instance: ObsInstance): void {
    if (instance.screenshotInterval) {
      clearTimeout(instance.screenshotInterval);
      instance.screenshotInterval = undefined;
    }
  }
}
