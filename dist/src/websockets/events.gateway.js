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
    eventEmitter;
    server;
    logger = new common_1.Logger('EventsGateway');
    activeUsers = new Map();
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    afterInit(server) {
        this.logger.log('WebSocket Gateway initialized');
    }
    async handleConnection(client, ...args) {
        const productionId = client.handshake.query.productionId;
        const userId = client.handshake.query.userId;
        const userName = client.handshake.query.userName;
        const roleName = client.handshake.query.roleName;
        if (productionId && userId) {
            client.join(`production_${productionId}`);
            this.activeUsers.set(client.id, {
                userId,
                userName: userName || 'User',
                roleName: roleName || 'Viewer',
                lastSeen: new Date().toISOString(),
                status: 'IDLE'
            });
            client.data.productionId = productionId;
            this.logger.log(`User ${userId} (${roleName}) joined production_${productionId}`);
            this.broadcastPresence(productionId);
        }
    }
    broadcastPresence(productionId) {
        const room = `production_${productionId}`;
        const socketIds = this.server.sockets.adapter.rooms.get(room);
        const members = [];
        if (socketIds) {
            for (const socketId of socketIds) {
                const data = this.activeUsers.get(socketId);
                if (data)
                    members.push(data);
            }
        }
        this.server.to(room).emit('presence.update', { members });
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const productionId = client.data.productionId;
        this.activeUsers.delete(client.id);
        if (productionId) {
            this.broadcastPresence(productionId);
        }
    }
    handleRoleIdentify(data, client) {
        const currentUser = this.activeUsers.get(client.id);
        if (currentUser) {
            this.activeUsers.set(client.id, {
                ...currentUser,
                roleName: data.roleName
            });
            const productionId = client.data.productionId;
            if (productionId) {
                this.broadcastPresence(productionId);
            }
        }
        return { status: 'ok', role: data.roleName };
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
                targetRole: { select: { id: true, name: true } },
                template: true
            }
        });
        const room = `production_${data.productionId}`;
        for (const [sid, user] of this.activeUsers.entries()) {
            const isTargeted = (data.targetUserId && user.userId === data.targetUserId) ||
                (!data.targetUserId && (user.roleName === data.targetRoleId || !data.targetRoleId));
            if (isTargeted) {
                this.activeUsers.set(sid, { ...user, status: data.message });
            }
        }
        this.broadcastPresence(data.productionId);
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
        const user = this.activeUsers.get(client.id);
        if (user) {
            this.activeUsers.set(client.id, { ...user, status: `OK: ${data.responseType}` });
            const productionId = client.data.productionId;
            if (productionId)
                this.broadcastPresence(productionId);
        }
        this.server.to(room).emit('command.ack_received', response);
        return { status: 'ok', responseId: response.id };
    }
    handleObsSceneChanged(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.scene.changed', {
            sceneName: payload.sceneName,
            cpuUsage: payload.cpuUsage,
            fps: payload.fps
        });
    }
    handleObsStreamState(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.stream.state', payload);
    }
    handleObsRecordState(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.record.state', payload);
    }
    handleObsConnectionState(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.connection.state', payload);
    }
    handleVmixInputChanged(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('vmix.input.changed', payload);
    }
    handleVmixConnectionState(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('vmix.connection.state', payload);
    }
    handleTimelineUpdated(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('timeline.updated', payload);
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('role.identify'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleRoleIdentify", null);
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
    (0, event_emitter_1.OnEvent)('obs.record.state'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleObsRecordState", null);
__decorate([
    (0, event_emitter_1.OnEvent)('obs.connection.state'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleObsConnectionState", null);
__decorate([
    (0, event_emitter_1.OnEvent)('vmix.input.changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleVmixInputChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)('vmix.connection.state'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleVmixConnectionState", null);
__decorate([
    (0, event_emitter_1.OnEvent)('timeline.updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleTimelineUpdated", null);
exports.EventsGateway = EventsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map