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
            this.connectVmix(config.productionId, config.url);
        }
    }
    connectVmix(productionId, url) {
        const existing = this.connections.get(productionId);
        if (existing) {
            this.disconnectVmix(productionId, existing);
        }
        const instance = { url };
        this.connections.set(productionId, instance);
        this.logger.log(`Starting vMix polling for production ${productionId} at ${url}`);
        instance.pollInterval = setInterval(async () => {
            await this.pollApi(productionId, instance);
        }, this.POLLING_RATE_MS);
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
            if (instance.activeInput !== newActive || instance.previewInput !== newPreview) {
                instance.activeInput = newActive;
                instance.previewInput = newPreview;
                this.eventEmitter.emit('vmix.input.changed', {
                    productionId,
                    activeInput: newActive,
                    previewInput: newPreview
                });
            }
            this.eventEmitter.emit('vmix.connection.state', { productionId, connected: true });
        }
        catch (error) {
            this.eventEmitter.emit('vmix.connection.state', { productionId, connected: false });
        }
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
exports.VmixConnectionManager = VmixConnectionManager = VmixConnectionManager_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], VmixConnectionManager);
//# sourceMappingURL=vmix-connection.manager.js.map