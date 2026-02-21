import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
export declare class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private prisma;
    server: Server;
    private logger;
    constructor(prisma: PrismaService);
    afterInit(server: Server): void;
    handleConnection(client: Socket, ...args: any[]): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleCommandSend(data: {
        productionId: string;
        senderId: string;
        targetRoleId?: string;
        templateId?: string;
        message: string;
        requiresAck?: boolean;
    }, client: Socket): Promise<{
        status: string;
        commandId: string;
    }>;
    handleCommandAck(data: {
        commandId: string;
        responderId: string;
        response: string;
        note?: string;
        productionId: string;
    }, client: Socket): Promise<{
        status: string;
        responseId: string;
    }>;
    handleObsSceneChanged(payload: {
        productionId: string;
        sceneName: string;
    }): void;
    handleObsStreamState(payload: {
        productionId: string;
        active: boolean;
        state: string;
    }): void;
    handleObsConnectionState(payload: {
        productionId: string;
        connected: boolean;
    }): void;
    handleVmixInputChanged(payload: {
        productionId: string;
        activeInput: number;
        previewInput: number;
    }): void;
    handleVmixConnectionState(payload: {
        productionId: string;
        connected: boolean;
    }): void;
    handleTimelineUpdated(payload: {
        productionId: string;
    }): void;
}
