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
const production_dto_1 = require("../productions/dto/production.dto");
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
            where: { isEnabled: true }
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
        const instance = { url };
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
        this.eventEmitter.emit('vmix.connection.state', { productionId, connected: false });
    }
    async stopPolling(productionId) {
        const instance = this.connections.get(productionId);
        if (instance) {
            this.disconnectVmix(productionId, instance);
        }
    }
    async pollApi(productionId, instance) {
        try {
            const apiUrl = instance.url.endsWith('/') ? `${instance.url}api` : `${instance.url}/api`;
            const response = await axios_1.default.get(apiUrl, { timeout: 800 });
            const xml = response.data;
            const parsed = await (0, xml2js_1.parseStringPromise)(xml, { explicitArray: false });
            if (!parsed || !parsed.vmix)
                return;
            const newActive = parseInt(parsed.vmix.active, 10);
            const newPreview = parseInt(parsed.vmix.preview, 10);
            const isStreaming = parsed.vmix.streaming === 'True';
            const isRecording = parsed.vmix.recording === 'True';
            const isExternal = parsed.vmix.external === 'True';
            const isMultiCorder = parsed.vmix.multiCorder === 'True';
            this.eventEmitter.emit('vmix.input.changed', {
                productionId,
                activeInput: newActive,
                previewInput: newPreview,
                isStreaming,
                isRecording,
                isExternal,
                isMultiCorder,
            });
            this.eventEmitter.emit('vmix.connection.state', { productionId, connected: true });
            this.eventEmitter.emit('production.health.stats', {
                productionId,
                engineType: production_dto_1.EngineType.VMIX,
                cpuUsage: 0,
                fps: 0,
                bitrate: 0,
                skippedFrames: 0,
                isStreaming,
                isRecording,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            this.eventEmitter.emit('vmix.connection.state', { productionId, connected: false });
        }
    }
    handleConnectionUpdate(payload) {
        if (payload.type === production_dto_1.EngineType.VMIX) {
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
        const apiUrl = instance.url.endsWith('/') ? `${instance.url}api` : `${instance.url}/api`;
        const query = new URLSearchParams({ Function: command, ...params }).toString();
        await axios_1.default.get(`${apiUrl}?${query}`);
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