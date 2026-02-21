import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('EventsGateway');

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
}
