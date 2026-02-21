import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import OBSWebSocket from 'obs-websocket-js';
import { PrismaService } from '../prisma/prisma.service';

interface ObsInstance {
    obs: OBSWebSocket;
    reconnectTimeout?: NodeJS.Timeout;
}

@Injectable()
export class ObsConnectionManager implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ObsConnectionManager.name);
    // Map of productionId -> ObsInstance
    private connections = new Map<string, ObsInstance>();

    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2
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
            where: { isEnabled: true }
        });

        for (const config of obsConnections) {
            this.connectObs(config.productionId, config.url, config.password || undefined);
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
        const instance: ObsInstance = { obs };
        this.connections.set(productionId, instance);

        // Setup Event Listeners
        obs.on('ConnectionClosed', (error) => {
            this.logger.warn(`OBS connection closed for production ${productionId}: ${error?.message || 'Unknown'}`);
            this.scheduleReconnect(productionId, url, password);
            // Emit internal event for UI updates
            this.eventEmitter.emit('obs.connection.state', { productionId, connected: false });
        });

        obs.on('ConnectionError', (error) => {
            this.logger.error(`OBS connection error for production ${productionId}`, error);
        });

        // OBS Domain Events forwarding
        obs.on('CurrentProgramSceneChanged', (data) => {
            this.eventEmitter.emit('obs.scene.changed', {
                productionId,
                sceneName: data.sceneName
            });
        });

        obs.on('StreamStateChanged', (data) => {
            this.eventEmitter.emit('obs.stream.state', {
                productionId,
                active: data.outputActive,
                state: data.outputState
            });
        });

        try {
            await obs.connect(url, password);
            this.logger.log(`Successfully connected to OBS for production ${productionId}`);
            // Clear any reconnect timeouts
            if (instance.reconnectTimeout) {
                clearTimeout(instance.reconnectTimeout);
                instance.reconnectTimeout = undefined;
            }
            this.eventEmitter.emit('obs.connection.state', { productionId, connected: true });
        } catch (error: any) {
            this.logger.error(`Failed to connect to OBS for production ${productionId}: ${error.message}`);
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
        // Remove listeners to prevent memory leaks or unwanted reconnects during manual disconnect
        instance.obs.removeAllListeners();
        instance.obs.disconnect().catch(() => { });
        this.connections.delete(productionId);
        this.eventEmitter.emit('obs.connection.state', { productionId, connected: false });
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
    private scheduleReconnect(productionId: string, url: string, password?: string) {
        const instance = this.connections.get(productionId);
        if (!instance) return; // Production was probably removed/disabled manually

        if (instance.reconnectTimeout) {
            clearTimeout(instance.reconnectTimeout);
        }

        // Try reconnecting in 5 seconds
        instance.reconnectTimeout = setTimeout(() => {
            this.logger.log(`Attempting to reconnect OBS for production ${productionId}...`);
            this.connectObs(productionId, url, password);
        }, 5000);
    }

    /**
     * Get the underlying OBS WebSocket instance for a production.
     */
    getInstance(productionId: string): OBSWebSocket | undefined {
        return this.connections.get(productionId)?.obs;
    }
}
