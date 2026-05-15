import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EngineType } from '@prisma/client';
import { ProductionHealthStats } from '@/streaming/streaming.types';
import { ObsInstance } from './obs-instance.types';

export class ObsStatsPoller {
  private static readonly logger = new Logger('ObsStatsPoller');

  static start(
    productionId: string,
    instance: ObsInstance,
    eventEmitter: EventEmitter2,
  ): void {
    ObsStatsPoller.stop(instance);
    ObsStatsPoller.logger.log(
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
            instance.lastState.outputSkippedFrames = streamStatus.outputSkippedFrames;
            instance.lastState.outputTotalFrames = streamStatus.outputTotalFrames;
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

          eventEmitter.emit('production.health.stats', healthStats);
        } catch (e: unknown) {
          ObsStatsPoller.logger.error(
            `Error polling OBS stats for ${productionId}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      })();
    }, 2000);
  }

  static stop(instance: ObsInstance): void {
    if (instance.statsInterval) {
      clearInterval(instance.statsInterval);
      instance.statsInterval = undefined;
    }
  }
}
