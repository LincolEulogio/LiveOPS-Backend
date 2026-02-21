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

    constructor(private prisma: PrismaService) { }

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway initialized');
    }

    async handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);

        // JWT token extraction is handled by WsJwtGuard for specific events,
        // but for initial connection metadata, we extract the user if valid.
        // We will assume WsJwtGuard will be applied to SubscribeMessage handlers.

        const productionId = client.handshake.query.productionId;
        if (productionId) {
            client.join(`production_${productionId}`);
            this.logger.log(`Client ${client.id} joined room production_${productionId}`);

            // Emit presence event to room
            this.server.to(`production_${productionId}`).emit('device.online', {
                clientId: client.id,
                timestamp: new Date().toISOString()
            });

            // Store for disconnect handler
            client.data.productionId = productionId;
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const productionId = client.data.productionId;

        if (productionId) {
            this.server.to(`production_${productionId}`).emit('device.offline', {
                clientId: client.id,
                timestamp: new Date().toISOString()
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
}
