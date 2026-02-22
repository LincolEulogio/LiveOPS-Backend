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
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { IntercomService } from '../intercom/intercom.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('EventsGateway');
    private activeUsers: Map<string, { userId: string; userName: string; roleId: string; roleName: string; lastSeen: string; status: string }> = new Map();

    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
        private intercomService: IntercomService
    ) { }

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway initialized');
    }

    async handleConnection(client: Socket, ...args: any[]) {
        const productionId = client.handshake.query.productionId as string;
        const userId = client.handshake.query.userId as string;
        const userName = client.handshake.query.userName as string;
        const roleId = client.handshake.query.roleId as string;
        const roleName = client.handshake.query.roleName as string;

        if (productionId && userId) {
            client.join(`production_${productionId}`);

            this.activeUsers.set(client.id, {
                userId,
                userName: userName || 'User',
                roleId: roleId || '',
                roleName: roleName || 'Viewer',
                lastSeen: new Date().toISOString(),
                status: 'IDLE'
            });

            client.data.productionId = productionId;
            this.logger.log(`User ${userId} (${roleName}) joined production_${productionId}`);

            this.broadcastPresence(productionId);
        }
    }

    private broadcastPresence(productionId: string) {
        const room = `production_${productionId}`;
        const socketIds = this.server.sockets.adapter.rooms.get(room);
        const members = [];

        if (socketIds) {
            for (const socketId of socketIds) {
                const data = this.activeUsers.get(socketId);
                if (data) members.push(data);
            }
        }

        this.server.to(room).emit('presence.update', { members });
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const productionId = client.data.productionId;

        this.activeUsers.delete(client.id);

        if (productionId) {
            this.broadcastPresence(productionId);
        }
    }

    @SubscribeMessage('role.identify')
    handleRoleIdentify(
        @MessageBody() data: { roleId: string; roleName: string },
        @ConnectedSocket() client: Socket
    ) {
        const currentUser = this.activeUsers.get(client.id);
        if (currentUser) {
            this.activeUsers.set(client.id, {
                ...currentUser,
                roleId: data.roleId,
                roleName: data.roleName
            });
            const productionId = client.data.productionId;
            if (productionId) {
                this.broadcastPresence(productionId);
            }
        }
        return { status: 'ok', role: data.roleName };
    }

    @SubscribeMessage('command.send')
    async handleCommandSend(
        @MessageBody() data: { productionId: string; senderId: string; targetUserId?: string; targetRoleId?: string; templateId?: string; message: string; requiresAck?: boolean },
        @ConnectedSocket() client: Socket
    ) {
        // Save to DB via service
        const command = await this.intercomService.sendCommand(data);

        // Update presence status for relevant users
        for (const [sid, user] of this.activeUsers.entries()) {
            const isTargeted =
                (data.targetUserId && user.userId === data.targetUserId) ||
                (!data.targetUserId && (user.roleId === data.targetRoleId || !data.targetRoleId));

            if (isTargeted) {
                this.activeUsers.set(sid, { ...user, status: data.message });
            }
        }
        this.broadcastPresence(data.productionId);

        return { status: 'ok', commandId: command.id };
    }

    @SubscribeMessage('command.ack')
    async handleCommandAck(
        @MessageBody() data: { commandId: string; responderId: string; response: string; note?: string; productionId: string; responseType?: string },
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
        // Update status to ACKNOWLEDGED for the specific responder
        const user = this.activeUsers.get(client.id);
        if (user) {
            this.activeUsers.set(client.id, { ...user, status: `OK: ${data.responseType}` });
            const productionId = client.data.productionId;
            if (productionId) this.broadcastPresence(productionId);
        }

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

    @OnEvent('command.created')
    handleCommandCreated(payload: { productionId: string; command: any }) {
        this.logger.log(`Broadcasting new command for production ${payload.productionId}`);
        this.server
            .to(`production_${payload.productionId}`)
            .emit('command.received', payload.command);
    }
}
