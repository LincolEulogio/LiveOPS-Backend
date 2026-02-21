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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
let EventsGateway = class EventsGateway {
    prisma;
    server;
    logger = new common_1.Logger('EventsGateway');
    constructor(prisma) {
        this.prisma = prisma;
    }
    afterInit(server) {
        this.logger.log('WebSocket Gateway initialized');
    }
    async handleConnection(client, ...args) {
        this.logger.log(`Client connected: ${client.id}`);
        const productionId = client.handshake.query.productionId;
        if (productionId) {
            client.join(`production_${productionId}`);
            this.logger.log(`Client ${client.id} joined room production_${productionId}`);
            this.server.to(`production_${productionId}`).emit('device.online', {
                clientId: client.id,
                timestamp: new Date().toISOString()
            });
            client.data.productionId = productionId;
        }
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const productionId = client.data.productionId;
        if (productionId) {
            this.server.to(`production_${productionId}`).emit('device.offline', {
                clientId: client.id,
                timestamp: new Date().toISOString()
            });
        }
    }
    async handleCommandSend(data, client) {
        const command = await this.prisma.command.create({
            data: {
                productionId: data.productionId,
                senderId: data.senderId,
                targetRoleId: data.targetRoleId,
                templateId: data.templateId,
                message: data.message,
                requiresAck: data.requiresAck ?? true,
                status: 'SENT'
            },
            include: {
                sender: { select: { id: true, name: true } },
                targetRole: { select: { id: true, name: true } }
            }
        });
        const room = `production_${data.productionId}`;
        this.server.to(room).emit('command.received', command);
        return { status: 'ok', commandId: command.id };
    }
    async handleCommandAck(data, client) {
        const response = await this.prisma.commandResponse.create({
            data: {
                commandId: data.commandId,
                responderId: data.responderId,
                response: data.response,
                note: data.note,
            },
            include: {
                responder: { select: { id: true, name: true } }
            }
        });
        const room = `production_${data.productionId}`;
        this.server.to(room).emit('command.ack_received', response);
        return { status: 'ok', responseId: response.id };
    }
    handleObsSceneChanged(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.scene.changed', { sceneName: payload.sceneName });
    }
    handleObsStreamState(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.stream.state', payload);
    }
    handleObsConnectionState(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.connection.state', payload);
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('command.send'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleCommandSend", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('command.ack'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleCommandAck", null);
__decorate([
    (0, event_emitter_1.OnEvent)('obs.scene.changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleObsSceneChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)('obs.stream.state'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleObsStreamState", null);
__decorate([
    (0, event_emitter_1.OnEvent)('obs.connection.state'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleObsConnectionState", null);
exports.EventsGateway = EventsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map