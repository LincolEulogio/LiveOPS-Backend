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
const intercom_service_1 = require("../intercom/intercom.service");
const chat_service_1 = require("../chat/chat.service");
const script_service_1 = require("../script/script.service");
let EventsGateway = class EventsGateway {
    prisma;
    eventEmitter;
    intercomService;
    chatService;
    scriptService;
    server;
    logger = new common_1.Logger('EventsGateway');
    activeUsers = new Map();
    constructor(prisma, eventEmitter, intercomService, chatService, scriptService) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.intercomService = intercomService;
        this.chatService = chatService;
        this.scriptService = scriptService;
    }
    afterInit(server) {
        this.logger.log('WebSocket Gateway initialized');
    }
    async handleChatSend(data, client) {
        const message = await this.chatService.saveMessage(data.productionId, data.userId, data.message);
        this.server
            .to(`production_${data.productionId}`)
            .emit('chat.received', message);
        return { status: 'ok', messageId: message.id };
    }
    handleChatTyping(data, client) {
        client.to(`production_${data.productionId}`).emit('chat.typing', data);
    }
    async handleScriptSync(data, client) {
        const script = await this.scriptService.getScriptState(data.productionId);
        client.emit('script.sync_response', { content: script?.content || null });
    }
    async handleScriptUpdate(data, client) {
        const updateArray = new Uint8Array(data.update);
        client
            .to(`production_${data.productionId}`)
            .emit('script.update_received', { update: updateArray });
        await this.scriptService.updateScriptState(data.productionId, Buffer.from(updateArray));
    }
    handleAwarenessUpdate(data, client) {
        client
            .to(`production_${data.productionId}`)
            .emit('script.awareness_received', {
            update: data.update,
        });
    }
    handleWebRTCSignal(data, client) {
        const senderUserId = client.handshake.query.userId;
        this.logger.debug(`WebRTC Signal from ${senderUserId} to ${data.targetUserId} in production ${data.productionId}`);
        const room = `production_${data.productionId}`;
        const socketsInRoom = this.server.sockets.adapter.rooms.get(room);
        if (socketsInRoom) {
            for (const socketId of socketsInRoom) {
                const socket = this.server.sockets.sockets.get(socketId);
                if (socket && socket.handshake.query.userId === data.targetUserId) {
                    socket.emit('webrtc.signal_received', {
                        senderUserId,
                        signal: data.signal
                    });
                    break;
                }
            }
        }
    }
    handleSocialOverlay(data, client) {
        this.server
            .to(`production_${data.productionId}`)
            .emit('social.overlay_update', { comment: data.comment });
    }
    handleScriptScrollSync(data, client) {
        client
            .to(`production_${data.productionId}`)
            .emit('script.scroll_received', {
            scrollPercentage: data.scrollPercentage,
        });
    }
    async handleConnection(client, ...args) {
        const productionId = client.handshake.query.productionId;
        const userId = client.handshake.query.userId;
        const userName = client.handshake.query.userName;
        const roleId = client.handshake.query.roleId;
        const roleName = client.handshake.query.roleName;
        if (productionId && userId) {
            client.join(`production_${productionId}`);
            this.activeUsers.set(client.id, {
                userId,
                userName: userName || 'User',
                roleId: roleId || '',
                roleName: roleName || 'Viewer',
                lastSeen: new Date().toISOString(),
                status: 'IDLE',
            });
            client.data.productionId = productionId;
            this.logger.log(`User ${userId} (${roleName}) joined production_${productionId}`);
            this.broadcastPresence(productionId);
        }
    }
    broadcastPresence(productionId) {
        const room = `production_${productionId}`;
        const socketIds = this.server.sockets.adapter.rooms.get(room);
        const uniqueMembers = new Map();
        if (socketIds) {
            for (const socketId of socketIds) {
                const data = this.activeUsers.get(socketId);
                if (data && data.userId) {
                    uniqueMembers.set(data.userId, data);
                }
            }
        }
        const members = Array.from(uniqueMembers.values());
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
    handleUserIdentify(data, client) {
        this.activeUsers.set(client.id, {
            userId: data.userId,
            userName: data.userName || 'User',
            roleId: data.roleId || '',
            roleName: data.roleName || 'Viewer',
            lastSeen: new Date().toISOString(),
            status: 'IDLE',
        });
        if (data.productionId) {
            client.join(`production_${data.productionId}`);
            client.data.productionId = data.productionId;
            this.broadcastPresence(data.productionId);
        }
        return { status: 'ok' };
    }
    handleRoleIdentify(data, client) {
        const currentUser = this.activeUsers.get(client.id);
        if (currentUser) {
            this.activeUsers.set(client.id, {
                ...currentUser,
                roleId: data.roleId,
                roleName: data.roleName,
            });
            const productionId = client.data.productionId;
            if (productionId) {
                this.broadcastPresence(productionId);
            }
        }
        return { status: 'ok', role: data.roleName };
    }
    async handleCommandSend(data, client) {
        console.log(`[Intercom] Sending command from ${data.senderId} to production ${data.productionId}`, data);
        const command = await this.intercomService.sendCommand(data);
        for (const [sid, user] of this.activeUsers.entries()) {
            const isTargeted = (data.targetUserId && user.userId === data.targetUserId) ||
                (!data.targetUserId &&
                    (user.roleId === data.targetRoleId || !data.targetRoleId));
            if (isTargeted) {
                this.activeUsers.set(sid, { ...user, status: data.message });
            }
        }
        this.broadcastPresence(data.productionId);
        return { status: 'ok', commandId: command.id };
    }
    async handleCommandAck(data, client) {
        console.log(`[Intercom] Received Ack from ${data.responderId} for command ${data.commandId}`);
        const response = await this.prisma.commandResponse.create({
            data: {
                commandId: data.commandId,
                responderId: data.responderId,
                response: data.response,
                note: data.note,
            },
            include: {
                responder: { select: { id: true, name: true } },
            },
        });
        const room = `production_${data.productionId}`;
        const user = this.activeUsers.get(client.id);
        if (user) {
            this.activeUsers.set(client.id, {
                ...user,
                status: `OK: ${data.responseType}`,
            });
            const productionId = client.data.productionId;
            if (productionId)
                this.broadcastPresence(productionId);
        }
        this.server.to(room).emit('command.ack_received', response);
        return { status: 'ok', responseId: response.id };
    }
    async handleObsSceneChanged(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.scene.changed', {
            sceneName: payload.sceneName,
            cpuUsage: payload.cpuUsage,
            fps: payload.fps,
        });
        const msg = await this.chatService.saveMessage(payload.productionId, null, `🎬 Escena cambiada a: ${payload.sceneName}`);
        this.server
            .to(`production_${payload.productionId}`)
            .emit('chat.received', msg);
    }
    async handleObsStreamState(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.stream.state', payload);
        const msg = await this.chatService.saveMessage(payload.productionId, null, payload.active
            ? `🔴 EMISIÓN INICIADA (${payload.state})`
            : `⚪ EMISIÓN DETENIDA (${payload.state})`);
        this.server
            .to(`production_${payload.productionId}`)
            .emit('chat.received', msg);
    }
    async handleObsRecordState(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.record.state', payload);
        const msg = await this.chatService.saveMessage(payload.productionId, null, payload.active
            ? `⏺️ GRABACIÓN INICIADA (${payload.state})`
            : `⏹️ GRABACIÓN DETENIDA (${payload.state})`);
        this.server
            .to(`production_${payload.productionId}`)
            .emit('chat.received', msg);
    }
    async handleObsConnectionState(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.connection.state', payload);
        const msg = await this.chatService.saveMessage(payload.productionId, null, payload.connected ? `🔗 OBS CONECTADO` : `❌ OBS DESCONECTADO`);
        this.server
            .to(`production_${payload.productionId}`)
            .emit('chat.received', msg);
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
    handleCommandCreated(payload) {
        this.logger.log(`Broadcasting new command for production ${payload.productionId}`);
        this.server
            .to(`production_${payload.productionId}`)
            .emit('command.received', payload.command);
    }
    handleProductionHealthStats(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('production.health.stats', payload);
    }
    handleSocialOverlayUpdate(payload) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('social.overlay_update', payload);
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat.send'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleChatSend", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('script.typing'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleChatTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('script.sync'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleScriptSync", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('script.update'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleScriptUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('script.awareness_update'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleAwarenessUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('webrtc.signal'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleWebRTCSignal", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('social.overlay'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleSocialOverlay", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('script.scroll_sync'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleScriptScrollSync", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('user.identify'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleUserIdentify", null);
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
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleObsSceneChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)('obs.stream.state'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleObsStreamState", null);
__decorate([
    (0, event_emitter_1.OnEvent)('obs.record.state'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleObsRecordState", null);
__decorate([
    (0, event_emitter_1.OnEvent)('obs.connection.state'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
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
__decorate([
    (0, event_emitter_1.OnEvent)('command.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleCommandCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('production.health.stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleProductionHealthStats", null);
__decorate([
    (0, event_emitter_1.OnEvent)('social.overlay_update'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleSocialOverlayUpdate", null);
exports.EventsGateway = EventsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2,
        intercom_service_1.IntercomService,
        chat_service_1.ChatService,
        script_service_1.ScriptService])
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map