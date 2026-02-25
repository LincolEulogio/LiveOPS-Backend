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
var VmixConnectionManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VmixConnectionManager = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
const event_emitter_2 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
let VmixConnectionManager = VmixConnectionManager_1 = class VmixConnectionManager {
    prisma;
    eventEmitter;
    logger = new common_1.Logger(VmixConnectionManager_1.name);
    connections = new Map();
    POLLING_RATE_MS = 1000;
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
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
    async loadAllConnections() {
        const vmixConnections = await this.prisma.vmixConnection.findMany({
            where: { isEnabled: true },
        });
        for (const config of vmixConnections) {
            this.connectVmix(config.productionId, config.url, config.pollingInterval);
        }
    }
    connectVmix(productionId, url, pollingInterval) {
        const existing = this.connections.get(productionId);
        if (existing) {
            this.disconnectVmix(productionId, existing);
        }
        const instance = {
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
        this.logger.log(`Starting vMix polling for production ${productionId} at ${url} (${interval}ms)`);
        instance.pollInterval = setInterval(async () => {
            await this.pollApi(productionId, instance);
        }, interval);
    }
    disconnectVmix(productionId, instance) {
        if (instance.pollInterval)
            clearInterval(instance.pollInterval);
        this.connections.delete(productionId);
        this.eventEmitter.emit('vmix.connection.state', {
            productionId,
            connected: false,
        });
    }
    async stopPolling(productionId) {
        const instance = this.connections.get(productionId);
        if (instance) {
            this.disconnectVmix(productionId, instance);
        }
    }
    getApiUrl(baseUrl) {
        let url = baseUrl.trim();
        if (!url.startsWith('http')) {
            url = `http://${url}`;
        }
        url = url.replace(/\/+$/, '');
        if (!url.endsWith('/api')) {
            url = `${url}/api`;
        }
        return url;
    }
    async pollApi(productionId, instance) {
        try {
            const apiUrl = this.getApiUrl(instance.url);
            const response = await axios_1.default.get(apiUrl, { timeout: 1200 });
            const xml = response.data;
            const parsed = await (0, xml2js_1.parseStringPromise)(xml, { explicitArray: false });
            if (!parsed || !parsed.vmix) {
                throw new Error('Invalid XML response from vMix');
            }
            const newActive = parseInt(parsed.vmix.active, 10);
            const newPreview = parseInt(parsed.vmix.preview, 10);
            const isStreaming = parsed.vmix.streaming === 'True';
            const isRecording = parsed.vmix.recording === 'True';
            const isExternal = parsed.vmix.external === 'True';
            const isMultiCorder = parsed.vmix.multiCorder === 'True';
            let inputsData = parsed.vmix.inputs?.input;
            if (inputsData && !Array.isArray(inputsData)) {
                inputsData = [inputsData];
            }
            const inputs = (inputsData || []).map((i) => ({
                number: parseInt(i.$.number, 10),
                title: i.$.title || `Input ${i.$.number}`,
                type: i.$.type,
                state: i.$.state,
                key: i.$.key,
            }));
            const rawFps = parsed.vmix.fps || '0';
            const fps = parseFloat(String(rawFps).replace(',', '.'));
            const renderTime = parseInt(parsed.vmix.renderTime || '0', 10);
            const vmixCpu = parsed.vmix.vmixCpuUsage ? parseFloat(parsed.vmix.vmixCpuUsage) : 0;
            instance.activeInput = newActive;
            instance.previewInput = newPreview;
            instance.isStreaming = isStreaming;
            instance.isRecording = isRecording;
            instance.isExternal = isExternal;
            instance.isMultiCorder = isMultiCorder;
            instance.inputs = inputs;
            const hasChanged = instance.activeInput !== newActive ||
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
                engineType: client_1.EngineType.VMIX,
                cpuUsage: vmixCpu,
                fps: fps || 0,
                bitrate: isStreaming ? 4500 : 0,
                skippedFrames: 0,
                totalFrames: 0,
                memoryUsage: 0,
                isStreaming,
                isRecording,
                timestamp: new Date().toISOString(),
                renderTime,
                version: parsed.vmix.version,
                edition: parsed.vmix.edition,
            });
        }
        catch (error) {
            instance.pollingFailureCount++;
            if (instance.isConnected && instance.pollingFailureCount >= 5) {
                this.logger.warn(`vMix connection lost for production ${productionId} after ${instance.pollingFailureCount} failures.`);
                instance.isConnected = false;
                this.eventEmitter.emit('vmix.connection.state', {
                    productionId,
                    connected: false,
                });
            }
            if (instance.pollingFailureCount === 1 || instance.pollingFailureCount === 5) {
                this.logger.debug(`vMix polling error for ${productionId}: ${error.message}`);
            }
        }
    }
    getVmixState(productionId) {
        const instance = this.connections.get(productionId);
        if (!instance)
            return { isConnected: false };
        return {
            isConnected: instance.isConnected,
            activeInput: instance.activeInput,
            previewInput: instance.previewInput,
            isStreaming: instance.isStreaming,
            isRecording: instance.isRecording,
            isExternal: instance.isExternal,
            isMultiCorder: instance.isMultiCorder,
            inputs: instance.inputs
        };
    }
    handleConnectionUpdate(payload) {
        if (payload.type === client_1.EngineType.VMIX) {
            this.logger.log(`Received connection update for production ${payload.productionId} (vMix)`);
            this.connectVmix(payload.productionId, payload.url, payload.pollingInterval);
        }
    }
    isConnected(productionId) {
        return this.connections.has(productionId);
    }
    async sendCommand(productionId, command, params = {}) {
        const instance = this.connections.get(productionId);
        if (!instance)
            throw new Error('vMix connection is not active or enabled');
        const apiUrl = this.getApiUrl(instance.url);
        const stringParams = {};
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
            await axios_1.default.get(fullUrl, { timeout: 2000 });
        }
        catch (e) {
            this.logger.error(`vMix command failed: ${e.message} (URL: ${fullUrl})`);
            throw e;
        }
    }
};
exports.VmixConnectionManager = VmixConnectionManager;
__decorate([
    (0, event_emitter_2.OnEvent)('engine.connection.update'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VmixConnectionManager.prototype, "handleConnectionUpdate", null);
exports.VmixConnectionManager = VmixConnectionManager = VmixConnectionManager_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], VmixConnectionManager);
//# sourceMappingURL=vmix-connection.manager.js.map