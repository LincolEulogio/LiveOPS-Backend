import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';
import { EngineType } from '@prisma/client';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { ProductionHealthStats } from '@/streaming/streaming.types';

export interface VmixInput {
  number: number;
  title: string;
  type: string;
  state: string;
  key: string;
}

interface VmixInstance {
  url: string;
  pollInterval?: NodeJS.Timeout;
  activeInput?: number;
  previewInput?: number;
  isStreaming: boolean;
  isRecording: boolean;
  isExternal: boolean;
  isMultiCorder: boolean;
  inputs: VmixInput[];
  pollingFailureCount: number;
  isConnected: boolean;
  lastHeartbeat?: string;
  lastLatency?: number;
}

@Injectable()
export class VmixConnectionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VmixConnectionManager.name);
  private connections = new Map<string, VmixInstance>();
  private readonly POLLING_RATE_MS = 1000; // Poll vMix API every second

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) { }

  async onModuleInit() {
    this.logger.log('Initializing vMix Connection Manager...');
    await this.loadAllConnections();
  }

  async onModuleDestroy() {
    this.logger.log('Destroying vMix Connection Manager...');
    for (const [productionId, instance] of this.connections.entries()) {
      this.disconnectVmix(productionId, instance);
    }
  }

  private async loadAllConnections() {
    const vmixConnections = await this.prisma.vmixConnection.findMany({
      where: { isEnabled: true },
    });

    for (const config of vmixConnections) {
      this.connectVmix(config.productionId, config.url, config.pollingInterval);
    }
  }

  connectVmix(productionId: string, url: string, pollingInterval?: number) {
    // Cleanup existing
    const existing = this.connections.get(productionId);
    if (existing) {
      this.disconnectVmix(productionId, existing);
    }

    const instance: VmixInstance = {
      url,
      pollingFailureCount: 0,
      isConnected: false,
      isStreaming: false,
      isRecording: false,
      isExternal: false,
      isMultiCorder: false,
      inputs: []
    };
    this.connections.set(productionId, instance);

    const interval = pollingInterval || this.POLLING_RATE_MS;
    this.logger.log(
      `Starting vMix polling for production ${productionId} at ${url} (${interval}ms)`,
    );

    // Start Polling Loop
    instance.pollInterval = setInterval(async () => {
      await this.pollApi(productionId, instance);
    }, interval);
  }

  private disconnectVmix(productionId: string, instance: VmixInstance) {
    if (instance.pollInterval) clearInterval(instance.pollInterval);
    this.connections.delete(productionId);
    this.eventEmitter.emit('vmix.connection.state', {
      productionId,
      connected: false,
    });
  }

  async stopPolling(productionId: string) {
    const instance = this.connections.get(productionId);
    if (instance) {
      this.disconnectVmix(productionId, instance);
    }
  }

  /**
   * Helper to construct a clean vMix API URL
   */
  private getApiUrl(baseUrl: string): string {
    let url = baseUrl.trim();
    if (!url.startsWith('http')) {
      url = `http://${url}`;
    }
    // Remove trailing slash if exists to avoid doubles
    url = url.replace(/\/+$/, '');

    // Ensure it ends with /api
    if (!url.endsWith('/api')) {
      url = `${url}/api`;
    }
    return url;
  }

  /**
   * Polls the vMix XML API, parses it, and checks for Active/Preview input changes.
   */
  private async pollApi(productionId: string, instance: VmixInstance) {
    try {
      const apiUrl = this.getApiUrl(instance.url);
      const startTime = Date.now();
      const response = await axios.get(apiUrl, { timeout: 1200 }); // Slightly longer timeout
      const latency = Date.now() - startTime;

      const xml = response.data;
      const parsed = await parseStringPromise(xml, { explicitArray: false });

      if (!parsed || !parsed.vmix) {
        throw new Error('Invalid XML response from vMix');
      }

      // Check Active and Preview Inputs
      const newActive = parseInt(parsed.vmix.active, 10);
      const newPreview = parseInt(parsed.vmix.preview, 10);
      const isStreaming = parsed.vmix.streaming === 'True';
      const isRecording = parsed.vmix.recording === 'True';
      const isExternal = parsed.vmix.external === 'True';
      const isMultiCorder = parsed.vmix.multiCorder === 'True';

      // Parse Inputs
      let inputsData = parsed.vmix.inputs?.input;
      if (inputsData && !Array.isArray(inputsData)) {
        inputsData = [inputsData];
      }

      const inputs: VmixInput[] = (inputsData || []).map((i: any) => ({
        number: parseInt(i.$.number, 10),
        title: i.$.title || `Input ${i.$.number}`,
        type: i.$.type,
        state: i.$.state,
        key: i.$.key,
      }));

      // Telemetry Extraction
      const rawFps = parsed.vmix.fps || '0';
      const fps = parseFloat(String(rawFps).replace(',', '.'));
      const renderTime = parseInt(parsed.vmix.renderTime || '0', 10);
      const vmixCpu = parsed.vmix.vmixCpuUsage ? parseFloat(parsed.vmix.vmixCpuUsage) : 0;

      // Update Instance State
      instance.activeInput = newActive;
      instance.previewInput = newPreview;
      instance.isStreaming = isStreaming;
      instance.isRecording = isRecording;
      instance.isExternal = isExternal;
      instance.isMultiCorder = isMultiCorder;
      instance.inputs = inputs;
      instance.lastHeartbeat = new Date().toISOString();
      instance.lastLatency = latency;

      // Only emit change if actual data changed to save bandwidth and prevent UI flickering
      const hasChanged =
        instance.activeInput !== newActive ||
        instance.previewInput !== newPreview ||
        instance.isStreaming !== isStreaming ||
        instance.isRecording !== isRecording ||
        instance.inputs.length !== inputs.length;

      if (hasChanged) {
        this.eventEmitter.emit('vmix.input.changed', {
          productionId,
          activeInput: newActive,
          previewInput: newPreview,
          isStreaming,
          isRecording,
          isExternal,
          isMultiCorder,
          inputs,
          version: parsed.vmix.version,
          edition: parsed.vmix.edition,
          fps: fps || 0,
          renderTime: renderTime || 0,
          url: instance.url
        });
      }

      // Emit connection state ONLY on transition to prevent frontend "flashing"
      if (!instance.isConnected) {
        this.logger.log(`vMix connected/restored for production ${productionId}`);
        instance.isConnected = true;
        this.eventEmitter.emit('vmix.connection.state', {
          productionId,
          connected: true,
        });
      }
      instance.pollingFailureCount = 0;

      this.eventEmitter.emit('production.health.stats', {
        productionId,
        engineType: EngineType.VMIX,
        cpuUsage: vmixCpu,
        fps: fps || 0,
        bitrate: isStreaming ? 4500 : 0,
        skippedFrames: 0,
        totalFrames: 0,
        memoryUsage: 0,
        isStreaming,
        isRecording,
        timestamp: instance.lastHeartbeat,
        renderTime,
        version: parsed.vmix.version,
        edition: parsed.vmix.edition,
        latency: instance.lastLatency,
      });
    } catch (error: any) {
      instance.pollingFailureCount++;

      // If we fail 5 times (default 5s at 1s rate), mark as disconnected
      if (instance.isConnected && instance.pollingFailureCount >= 5) {
        this.logger.warn(`vMix connection lost for production ${productionId} after ${instance.pollingFailureCount} failures.`);
        instance.isConnected = false;
        this.eventEmitter.emit('vmix.connection.state', {
          productionId,
          connected: false,
        });
      }

      // Log error only if it's the first few failures or we are transitioning to disconnected
      if (instance.pollingFailureCount === 1 || instance.pollingFailureCount === 5) {
        this.logger.debug(`vMix polling error for ${productionId}: ${error.message}`);
      }
    }
  }

  /**
   * Get current state
   */
  getVmixState(productionId: string) {
    const instance = this.connections.get(productionId);
    if (!instance) return { isConnected: false };

    return {
      isConnected: instance.isConnected,
      activeInput: instance.activeInput,
      previewInput: instance.previewInput,
      isStreaming: instance.isStreaming,
      isRecording: instance.isRecording,
      isExternal: instance.isExternal,
      isMultiCorder: instance.isMultiCorder,
      inputs: instance.inputs,
      lastHeartbeat: instance.lastHeartbeat,
      lastLatency: instance.lastLatency
    };
  }

  /**
   * Listen for external connection updates
   */
  @OnEvent('engine.connection.update')
  handleConnectionUpdate(payload: {
    productionId: string;
    type: EngineType;
    url: string;
    pollingInterval?: number;
  }) {
    if (payload.type === EngineType.VMIX) {
      this.logger.log(
        `Received connection update for production ${payload.productionId} (vMix)`,
      );
      this.connectVmix(
        payload.productionId,
        payload.url,
        payload.pollingInterval,
      );
    }
  }

  /**
   * Check if a production has an active vMix connection
   */
  isConnected(productionId: string): boolean {
    return this.connections.has(productionId);
  }

  /**
   * Used to send direct commands to vMix
   */
  async sendCommand(
    productionId: string,
    command: string,
    params: Record<string, string | number> = {},
  ) {
    const instance = this.connections.get(productionId);
    if (!instance) throw new Error('vMix connection is not active or enabled');

    const apiUrl = this.getApiUrl(instance.url);

    // Build query string e.g., ?Function=Cut&Input=1
    const stringParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, val]) => {
      stringParams[key] = String(val);
    });

    const query = new URLSearchParams({
      Function: command,
      ...stringParams,
    }).toString();

    const fullUrl = `${apiUrl}?${query}`;
    this.logger.debug(`Sending vMix command: ${fullUrl}`);

    try {
      await axios.get(fullUrl, { timeout: 2000 });
    } catch (e: any) {
      this.logger.error(`vMix command failed: ${e.message} (URL: ${fullUrl})`);
      throw e;
    }
  }
}
