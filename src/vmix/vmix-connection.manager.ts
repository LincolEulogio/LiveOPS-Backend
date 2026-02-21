import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';
import { EngineType } from '../productions/dto/production.dto';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

interface VmixInstance {
    url: string;
    pollInterval?: NodeJS.Timeout;
    activeInput?: number;
    previewInput?: number;
}

@Injectable()
export class VmixConnectionManager implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(VmixConnectionManager.name);
    private connections = new Map<string, VmixInstance>();
    private readonly POLLING_RATE_MS = 1000; // Poll vMix API every second

    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2
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
            where: { isEnabled: true }
        });

        for (const config of vmixConnections) {
            this.connectVmix(config.productionId, config.url);
        }
    }

    connectVmix(productionId: string, url: string) {
        // Cleanup existing
        const existing = this.connections.get(productionId);
        if (existing) {
            this.disconnectVmix(productionId, existing);
        }

        const instance: VmixInstance = { url };
        this.connections.set(productionId, instance);

        this.logger.log(`Starting vMix polling for production ${productionId} at ${url}`);

        // Start Polling Loop
        instance.pollInterval = setInterval(async () => {
            await this.pollApi(productionId, instance);
        }, this.POLLING_RATE_MS);
    }

    private disconnectVmix(productionId: string, instance: VmixInstance) {
        if (instance.pollInterval) clearInterval(instance.pollInterval);
        this.connections.delete(productionId);
        this.eventEmitter.emit('vmix.connection.state', { productionId, connected: false });
    }

    async stopPolling(productionId: string) {
        const instance = this.connections.get(productionId);
        if (instance) {
            this.disconnectVmix(productionId, instance);
        }
    }

    /**
     * Polls the vMix XML API, parses it, and checks for Active/Preview input changes.
     */
    private async pollApi(productionId: string, instance: VmixInstance) {
        try {
            // The API endpoint is usually /api
            const apiUrl = instance.url.endsWith('/') ? `${instance.url}api` : `${instance.url}/api`;
            const response = await axios.get(apiUrl, { timeout: 800 }); // Fast fail

            const xml = response.data;
            const parsed = await parseStringPromise(xml, { explicitArray: false });

            if (!parsed || !parsed.vmix) return; // Invalid XML

            // Check Active and Preview Inputs
            const newActive = parseInt(parsed.vmix.active, 10);
            const newPreview = parseInt(parsed.vmix.preview, 10);
            const isStreaming = parsed.vmix.streaming === 'True';
            const isRecording = parsed.vmix.recording === 'True';
            const isExternal = parsed.vmix.external === 'True';
            const isMultiCorder = parsed.vmix.multiCorder === 'True';

            // Emit domain event if inputs or states changed
            this.eventEmitter.emit('vmix.input.changed', {
                productionId,
                activeInput: newActive,
                previewInput: newPreview,
                isStreaming,
                isRecording,
                isExternal,
                isMultiCorder,
            });

            // We consider it connected if the poll succeeded
            this.eventEmitter.emit('vmix.connection.state', { productionId, connected: true });

        } catch (error) {
            // Log silently unless debugging, as this will spam if vMix is off
            this.eventEmitter.emit('vmix.connection.state', { productionId, connected: false });
        }
    }

    /**
     * Listen for external connection updates
     */
    @OnEvent('engine.connection.update')
    handleConnectionUpdate(payload: { productionId: string, type: EngineType, url: string }) {
        if (payload.type === EngineType.VMIX) {
            this.logger.log(`Received connection update for production ${payload.productionId} (vMix)`);
            this.connectVmix(payload.productionId, payload.url);
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
    async sendCommand(productionId: string, command: string, params: Record<string, string | number> = {}) {
        const instance = this.connections.get(productionId);
        if (!instance) throw new Error('vMix connection is not active or enabled');

        const apiUrl = instance.url.endsWith('/') ? `${instance.url}api` : `${instance.url}/api`;

        // Build query string e.g., ?Function=Cut&Input=1
        const query = new URLSearchParams({ Function: command, ...params as any }).toString();

        await axios.get(`${apiUrl}?${query}`);
    }
}
