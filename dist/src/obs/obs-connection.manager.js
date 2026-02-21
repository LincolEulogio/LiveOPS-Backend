"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ObsConnectionManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObsConnectionManager = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const obs_websocket_js_1 = __importDefault(require("obs-websocket-js"));
const prisma_service_1 = require("../prisma/prisma.service");
const event_emitter_2 = require("@nestjs/event-emitter");
const production_dto_1 = require("../productions/dto/production.dto");
let ObsConnectionManager = ObsConnectionManager_1 = class ObsConnectionManager {
    prisma;
    eventEmitter;
    logger = new common_1.Logger(ObsConnectionManager_1.name);
    connections = new Map();
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
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
    async loadAllConnections() {
        const obsConnections = await this.prisma.obsConnection.findMany({
            where: { isEnabled: true }
        });
        for (const config of obsConnections) {
            this.connectObs(config.productionId, config.url, config.password || undefined);
        }
    }
    async connectObs(productionId, url, password) {
        const existing = this.connections.get(productionId);
        if (existing) {
            this.disconnectInstance(productionId, existing);
        }
        const obs = new obs_websocket_js_1.default();
        const instance = { obs, isConnected: false };
        this.connections.set(productionId, instance);
        obs.on('ConnectionClosed', (error) => {
            this.logger.warn(`OBS connection closed for production ${productionId}: ${error?.message || 'Unknown'}`);
            instance.isConnected = false;
            this.scheduleReconnect(productionId, url, password);
            this.eventEmitter.emit('obs.connection.state', { productionId, connected: false });
        });
        obs.on('ConnectionError', (error) => {
            this.logger.error(`OBS connection error for production ${productionId}`, error);
        });
        obs.on('CurrentProgramSceneChanged', (data) => {
            if (instance.lastState) {
                instance.lastState.currentScene = data.sceneName;
            }
            this.eventEmitter.emit('obs.scene.changed', {
                productionId,
                sceneName: data.sceneName
            });
        });
        obs.on('StreamStateChanged', (data) => {
            if (instance.lastState) {
                instance.lastState.isStreaming = data.outputActive;
            }
            this.eventEmitter.emit('obs.stream.state', {
                productionId,
                active: data.outputActive,
                state: data.outputState
            });
        });
        obs.on('RecordStateChanged', (data) => {
            if (instance.lastState) {
                instance.lastState.isRecording = data.outputActive;
            }
            this.eventEmitter.emit('obs.record.state', {
                productionId,
                active: data.outputActive,
                state: data.outputState
            });
        });
        obs.on('SceneListChanged', async () => {
            try {
                const sceneList = await obs.call('GetSceneList');
                if (instance.lastState) {
                    instance.lastState.scenes = sceneList.scenes.map((s) => s.sceneName);
                    instance.lastState.currentScene = sceneList.currentProgramSceneName;
                }
                this.eventEmitter.emit('obs.scene.changed', {
                    productionId,
                    sceneName: sceneList.currentProgramSceneName
                });
            }
            catch (e) {
                this.logger.error(`Failed to refresh scene list for production ${productionId}: ${e.message}`);
            }
        });
        try {
            await obs.connect(url, password);
            this.logger.log(`Successfully connected to OBS for production ${productionId}`);
            instance.isConnected = true;
            if (instance.reconnectTimeout) {
                clearTimeout(instance.reconnectTimeout);
                instance.reconnectTimeout = undefined;
            }
            this.eventEmitter.emit('obs.connection.state', { productionId, connected: true });
            const [sceneList, streamStatus, recordStatus, stats, videoSettings] = await Promise.all([
                obs.call('GetSceneList'),
                obs.call('GetStreamStatus'),
                obs.call('GetRecordStatus'),
                obs.call('GetStats'),
                obs.call('GetVideoSettings')
            ]);
            const fps = Math.round(videoSettings.fpsNumerator / videoSettings.fpsDenominator);
            instance.lastState = {
                currentScene: sceneList.currentProgramSceneName,
                scenes: sceneList.scenes.map((s) => s.sceneName),
                isStreaming: streamStatus.outputActive,
                isRecording: recordStatus.outputActive,
                cpuUsage: stats.cpuUsage,
                fps: fps,
            };
            this.eventEmitter.emit('obs.scene.changed', {
                productionId,
                sceneName: sceneList.currentProgramSceneName,
                cpuUsage: stats.cpuUsage,
                fps: fps,
            });
        }
        catch (error) {
            this.logger.error(`Failed to connect to OBS for production ${productionId}: ${error.message}`);
            this.scheduleReconnect(productionId, url, password);
        }
    }
    disconnectInstance(productionId, instance) {
        if (instance.reconnectTimeout) {
            clearTimeout(instance.reconnectTimeout);
        }
        instance.obs.removeAllListeners();
        instance.obs.disconnect().catch(() => { });
        this.connections.delete(productionId);
        this.eventEmitter.emit('obs.connection.state', { productionId, connected: false });
    }
    async disconnectObs(productionId) {
        const instance = this.connections.get(productionId);
        if (instance) {
            this.disconnectInstance(productionId, instance);
        }
    }
    scheduleReconnect(productionId, url, password) {
        const instance = this.connections.get(productionId);
        if (!instance)
            return;
        if (instance.reconnectTimeout) {
            clearTimeout(instance.reconnectTimeout);
        }
        instance.reconnectTimeout = setTimeout(() => {
            this.logger.log(`Attempting to reconnect OBS for production ${productionId}...`);
            this.connectObs(productionId, url, password);
        }, 5000);
    }
    handleConnectionUpdate(payload) {
        if (payload.type === production_dto_1.EngineType.OBS) {
            this.logger.log(`Received connection update for production ${payload.productionId} (OBS)`);
            this.connectObs(payload.productionId, payload.url, payload.password);
        }
    }
    getInstance(productionId) {
        const instance = this.connections.get(productionId);
        return instance?.isConnected ? instance.obs : undefined;
    }
    getObsState(productionId) {
        const instance = this.connections.get(productionId);
        if (!instance)
            return { isConnected: false };
        return {
            isConnected: instance.isConnected,
            ...instance.lastState,
        };
    }
};
exports.ObsConnectionManager = ObsConnectionManager;
__decorate([
    (0, event_emitter_2.OnEvent)('engine.connection.update'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ObsConnectionManager.prototype, "handleConnectionUpdate", null);
exports.ObsConnectionManager = ObsConnectionManager = ObsConnectionManager_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], ObsConnectionManager);
//# sourceMappingURL=obs-connection.manager.js.map