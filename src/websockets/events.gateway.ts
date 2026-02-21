import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('EventsGateway');

    constructor(
        private prisma: PrismaService,
        private eventEmitter: import('@nestjs/event-emitter').EventEmitter2
    ) { }

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway initialized');
    }

    async handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);

        // JWT token extraction is handled by WsJwtGuard for specific events,
        // but for initial connection metadata, we extract the user if valid.
        // We will assume WsJwtGuard will be applied to SubscribeMessage handlers.

        const productionId = client.handshake.query.productionId as string;
        if (productionId) {
            client.join(`production_${productionId}`);
            this.logger.log(`Client ${client.id} joined room production_${productionId}`);

            // Emit presence event to room
            this.server.to(`production_${productionId}`).emit('device.online', {
                clientId: client.id,
                timestamp: new Date().toISOString()
            });

            // Emit internal event for logging
            this.eventEmitter.emit('device.online', {
                productionId,
                clientId: client.id
            });

            // Store for disconnect handler
            client.data.productionId = productionId;
        }
    }

    @SubscribeMessage('production.join')
    handleJoinRoom(
        @MessageBody() data: { productionId: string },
        @ConnectedSocket() client: Socket
    ) {
        const room = `production_${data.productionId}`;
        client.join(room);
        client.data.productionId = data.productionId; // Track for disconnect
        this.logger.log(`Client ${client.id} manually joined room ${room}`);
        return { status: 'joined', room };
    }

    @SubscribeMessage('production.leave')
    handleLeaveRoom(
        @MessageBody() data: { productionId: string },
        @ConnectedSocket() client: Socket
    ) {
        const room = `production_${data.productionId}`;
        client.leave(room);
        delete client.data.productionId;
        this.logger.log(`Client ${client.id} manually left room ${room}`);
        return { status: 'left', room };
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const productionId = client.data.productionId;

        if (productionId) {
            this.server.to(`production_${productionId}`).emit('device.offline', {
                clientId: client.id,
                timestamp: new Date().toISOString()
            });

            this.eventEmitter.emit('device.offline', {
                productionId,
                clientId: client.id
            });
        }
    }

    @SubscribeMessage('command.send')
    async handleCommandSend(
        @MessageBody() data: { productionId: string; senderId: string; targetRoleId?: string; templateId?: string; message: string; requiresAck?: boolean },
        @ConnectedSocket() client: Socket
    ) {
        // Validate payload and save to DB
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

        // Broadcast to specific role or all
        const room = `production_${data.productionId}`;
        this.server.to(room).emit('command.received', command);

        return { status: 'ok', commandId: command.id };
    }

    @SubscribeMessage('command.ack')
    async handleCommandAck(
        @MessageBody() data: { commandId: string; responderId: string; response: string; note?: string; productionId: string },
        @ConnectedSocket() client: Socket
    ) {
        // Save response to DB
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

        // Broadcast ACK back to sender / room
        const room = `production_${data.productionId}`;
        this.server.to(room).emit('command.ack_received', response);

        return { status: 'ok', responseId: response.id };
    }

    // --- Internal Events Handlers (Forwarding to WS) ---

    @OnEvent('obs.scene.changed')
    handleObsSceneChanged(payload: { productionId: string; sceneName: string; cpuUsage?: number; fps?: number }) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.scene.changed', {
                sceneName: payload.sceneName,
                cpuUsage: payload.cpuUsage,
                fps: payload.fps
            });
    }

    @OnEvent('obs.stream.state')
    handleObsStreamState(payload: { productionId: string; active: boolean; state: string }) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.stream.state', payload);
    }

    @OnEvent('obs.record.state')
    handleObsRecordState(payload: { productionId: string; active: boolean; state: string }) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.record.state', payload);
    }

    @OnEvent('obs.connection.state')
    handleObsConnectionState(payload: { productionId: string; connected: boolean }) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('obs.connection.state', payload);
    }

    @OnEvent('vmix.input.changed')
    handleVmixInputChanged(payload: {
        productionId: string;
        activeInput: number;
        previewInput: number;
        isStreaming?: boolean;
        isRecording?: boolean;
        isExternal?: boolean;
        isMultiCorder?: boolean;
    }) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('vmix.input.changed', payload);
    }

    @OnEvent('vmix.connection.state')
    handleVmixConnectionState(payload: { productionId: string; connected: boolean }) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('vmix.connection.state', payload);
    }

    @OnEvent('timeline.updated')
    handleTimelineUpdated(payload: { productionId: string }) {
        this.server
            .to(`production_${payload.productionId}`)
            .emit('timeline.updated', payload);
    }
}
