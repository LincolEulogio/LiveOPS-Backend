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
import { EngineType, ProductionStatus } from '@prisma/client';

import { ProductionHealthStats } from '@/streaming/streaming.types';

export interface ObsScene {
  sceneName: string;
  sceneIndex: number;
}

interface ObsInstance {
  obs: OBSWebSocket;
  reconnectTimeout?: NodeJS.Timeout;
  statsInterval?: NodeJS.Timeout;
  heartbeatInterval?: NodeJS.Timeout;
  isConnected: boolean;
  reconnectAttempts: number;
  lastState?: {
    currentScene: string;
    scenes: string[];
    isStreaming: boolean;
    isRecording: boolean;
    cpuUsage: number;
    fps: number;
    bitrate?: number;
    outputSkippedFrames?: number;
    outputTotalFrames?: number;
  };
}

@Injectable()
export class ObsConnectionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ObsConnectionManager.name);
  // Map of productionId -> ObsInstance
  private connections = new Map<string, ObsInstance>();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) { }

  async onModuleInit() {
    this.logger.log('Initializing OBS Connection Manager...');
    await this.loadAllConnections();
  }

  async onModuleDestroy() {
    this.logger.log('Destroying OBS Connection Manager...');
    for (const [productionId, instance] of this.connections.entries()) {
      this.disconnectInstance(productionId, instance);
    }
  }

  /**
   * Load and connect all enabled OBS configurations from the database.
   */
  private async loadAllConnections() {
    const obsConnections = await this.prisma.obsConnection.findMany({
      where: { isEnabled: true },
    });

    for (const config of obsConnections) {
      this.connectObs(
        config.productionId,
        config.url,
        config.password || undefined,
      );
    }
  }

  /**
   * Establish a connection to an OBS instance.
   */
  async connectObs(productionId: string, url: string, password?: string) {
    // Clean up existing connection if there is one
    const existing = this.connections.get(productionId);
    if (existing) {
      this.disconnectInstance(productionId, existing);
    }

    const obs = new OBSWebSocket();
    const instance: ObsInstance = { obs, isConnected: false, reconnectAttempts: existing?.reconnectAttempts || 0 };
    this.connections.set(productionId, instance);

    // Setup Event Listeners
    obs.on('ConnectionClosed', (error) => {
      this.logger.warn(
        `OBS connection closed for production ${productionId}: ${error?.message || 'Unknown'}`,
      );
      instance.isConnected = false;
      this.scheduleReconnect(productionId, url, password);
      // Emit internal event for UI updates
      this.eventEmitter.emit('obs.connection.state', {
        productionId,
        connected: false,
      });
    });

    obs.on('ConnectionError', (error) => {
      this.logger.error(
        `OBS connection error for production ${productionId}`,
        error,
      );
    });

    // OBS Domain Events forwarding
    obs.on('CurrentProgramSceneChanged', (data) => {
      if (instance.lastState) {
        instance.lastState.currentScene = data.sceneName;
      }
      this.eventEmitter.emit('obs.scene.changed', {
        productionId,
        sceneName: data.sceneName,
      });
    });

    obs.on('StreamStateChanged', (data) => {
      if (instance.lastState) {
        instance.lastState.isStreaming = data.outputActive;
      }
      this.eventEmitter.emit('obs.stream.state', {
        productionId,
        active: data.outputActive,
        state: data.outputState,
      });
    });

    obs.on('RecordStateChanged', (data) => {
      if (instance.lastState) {
        instance.lastState.isRecording = data.outputActive;
      }
      this.eventEmitter.emit('obs.record.state', {
        productionId,
        active: data.outputActive,
        state: data.outputState,
      });
    });

    obs.on('SceneListChanged', async () => {
      try {
        const sceneList = await obs.call('GetSceneList');
        if (instance.lastState) {
          instance.lastState.scenes = (sceneList.scenes as unknown as ObsScene[]).map(
            (s) => s.sceneName,
          );
          instance.lastState.currentScene = sceneList.currentProgramSceneName;
        }
        // We might want to emit a full state update here but usually scenes list is enough
        this.eventEmitter.emit('obs.scene.changed', {
          productionId,
          sceneName: sceneList.currentProgramSceneName,
        });
      } catch (e) {
        this.logger.error(
          `Failed to refresh scene list for production ${productionId}: ${e.message}`,
        );
      }
    });

    try {
      await obs.connect(url, password);
      this.logger.log(
        `Successfully connected to OBS for production ${productionId}`,
      );

      // Mark as connected IMMEDIATELY after handshake
      instance.isConnected = true;
      instance.reconnectAttempts = 0; // Reset attempts on success

      // Clear any reconnect timeouts
      if (instance.reconnectTimeout) {
        clearTimeout(instance.reconnectTimeout);
        instance.reconnectTimeout = undefined;
      }
      this.eventEmitter.emit('obs.connection.state', {
        productionId,
        connected: true,
      });

      // Fetch metadata in background or before final resolution
      const [sceneList, streamStatus, recordStatus, stats, videoSettings] =
        await Promise.all([
          obs.call('GetSceneList'),
          obs.call('GetStreamStatus'),
          obs.call('GetRecordStatus'),
          obs.call('GetStats'),
          obs.call('GetVideoSettings'),
        ]);

      const fps = Math.round(
        videoSettings.fpsNumerator / videoSettings.fpsDenominator,
      );

      instance.lastState = {
        currentScene: sceneList.currentProgramSceneName,
        scenes: (sceneList.scenes as unknown as ObsScene[]).map((s) => s.sceneName),
        isStreaming: streamStatus.outputActive,
        isRecording: recordStatus.outputActive,
        cpuUsage: stats.cpuUsage,
        fps: fps,
        bitrate: streamStatus.outputSkippedFrames !== undefined ? 0 : undefined, // streamStatus might not have bitrate initially
      };

      // Start polling immediately after connection, even if not streaming
      this.startStatsPolling(productionId, instance);
      this.startHeartbeat(productionId, instance);

      // Re-emit scene change if we have one to populate frontend
      this.eventEmitter.emit('obs.scene.changed', {
        productionId,
        sceneName: sceneList.currentProgramSceneName,
        cpuUsage: stats.cpuUsage,
        fps: fps,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to connect to OBS for production ${productionId}: ${message}`,
      );
      this.scheduleReconnect(productionId, url, password);
    }
  }

  /**
   * Disconnect and clean up an OBS instance.
   */
  private disconnectInstance(productionId: string, instance: ObsInstance) {
    if (instance.reconnectTimeout) {
      clearTimeout(instance.reconnectTimeout);
    }
    this.stopStatsPolling(instance);
    this.stopHeartbeat(instance);
    // Remove listeners to prevent memory leaks or unwanted reconnects during manual disconnect
    instance.obs.removeAllListeners();
    instance.obs.disconnect().catch(() => { });
    this.connections.delete(productionId);
    this.eventEmitter.emit('obs.connection.state', {
      productionId,
      connected: false,
    });
  }

  /**
   * Manually disconnect (e.g., when a user disables the connection).
   */
  async disconnectObs(productionId: string) {
    const instance = this.connections.get(productionId);
    if (instance) {
      this.disconnectInstance(productionId, instance);
    }
  }

  /**
   * Schedule a reconnection attempt.
   */
  private scheduleReconnect(
    productionId: string,
    url: string,
    password?: string,
  ) {
    const instance = this.connections.get(productionId);
    if (!instance) return; // Production was probably removed/disabled manually

    if (instance.reconnectTimeout) {
      clearTimeout(instance.reconnectTimeout);
    }

    instance.reconnectAttempts++;
    // Exponential backoff: 2s, 4s, 8s, 16s, up to 30s max
    const delay = Math.min(Math.pow(2, instance.reconnectAttempts) * 1000, 30000);

    this.logger.log(
      `Scheduling reconnect attempt ${instance.reconnectAttempts} for OBS (Production: ${productionId}) in ${delay / 1000}s`,
    );

    instance.reconnectTimeout = setTimeout(() => {
      this.connectObs(productionId, url, password);
    }, delay);
  }

  private startHeartbeat(productionId: string, instance: ObsInstance) {
    this.stopHeartbeat(instance);
    instance.heartbeatInterval = setInterval(async () => {
      if (!instance.isConnected) return;
      try {
        // Simple call to check if connection is still alive
        await instance.obs.call('GetVersion');
      } catch (e) {
        this.logger.warn(`Heartbeat failed for OBS (Production: ${productionId}), marking as disconnected.`);
        instance.isConnected = false;
        // The ConnectionClosed event might not fire immediately, so we force-close
        instance.obs.disconnect().catch(() => { });
        // ConnectionClosed listener will trigger scheduleReconnect
      }
    }, 10000); // 10s heartbeat
  }

  private stopHeartbeat(instance: ObsInstance) {
    if (instance.heartbeatInterval) {
      clearInterval(instance.heartbeatInterval);
      instance.heartbeatInterval = undefined;
    }
  }

  /**
   * Listen for external connection updates
   */
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
      this.connectObs(payload.productionId, payload.url, payload.password);
    }
  }

  private startStatsPolling(productionId: string, instance: ObsInstance) {
    this.stopStatsPolling(instance);
    this.logger.log(
      `Starting Technical Stats Polling for production ${productionId} (OBS)`,
    );

    instance.statsInterval = setInterval(async () => {
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
          instance.lastState.outputTotalFrames = streamStatus.outputTotalFrames;
          // Note: obs-websocket-js v5 streamStatus might not have 'kbitrate' directly in every version,
          // but we focus on cpu and drops if available.
        }

        const recordStatus = await instance.obs.call('GetRecordStatus');

        const healthStats: ProductionHealthStats = {
          productionId,
          engineType: EngineType.OBS,
          cpuUsage: stats.cpuUsage,
          fps: stats.activeFps,
          bitrate: streamStatus.outputActive ? 5500 : 0, // Placeholder bitate in kbps
          skippedFrames: streamStatus.outputSkippedFrames || 0,
          totalFrames: streamStatus.outputTotalFrames || 0,
          memoryUsage: stats.memoryUsage,
          availableDiskSpace: stats.availableDiskSpace, // Added disk space
          isStreaming: streamStatus.outputActive,
          isRecording: recordStatus.outputActive,
          timestamp: new Date().toISOString(),
        };

        this.eventEmitter.emit('production.health.stats', healthStats);
      } catch (e) {
        this.logger.error(
          `Error polling OBS stats for ${productionId}: ${e.message}`,
        );
      }
    }, 2000);
  }

  private stopStatsPolling(instance: ObsInstance) {
    if (instance.statsInterval) {
      clearInterval(instance.statsInterval);
      instance.statsInterval = undefined;
    }
  }

  /**
   * Get the underlying OBS WebSocket instance for a production.
   */
  getInstance(productionId: string): OBSWebSocket | undefined {
    const instance = this.connections.get(productionId);
    return instance?.isConnected ? instance.obs : undefined;
  }

  /**
   * Get the latest known state for a production's OBS connection.
   */
  getObsState(productionId: string) {
    const instance = this.connections.get(productionId);
    if (!instance) return { isConnected: false };

    return {
      isConnected: instance.isConnected,
      ...instance.lastState,
    };
  }
}
