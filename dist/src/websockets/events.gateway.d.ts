import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
export declare class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private prisma;
    private eventEmitter;
    server: Server;
    private logger;
    private activeUsers;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    afterInit(server: Server): void;
    handleConnection(client: Socket, ...args: any[]): Promise<void>;
    private broadcastPresence;
    handleDisconnect(client: Socket): void;
    handleRoleIdentify(data: {
        roleId: string;
        roleName: string;
    }, client: Socket): {
        status: string;
        role: string;
    };
    handleCommandSend(data: {
        productionId: string;
        senderId: string;
        targetUserId?: string;
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
        responseType?: string;
    }, client: Socket): Promise<{
        status: string;
        responseId: string;
    }>;
    handleObsSceneChanged(payload: {
        productionId: string;
        sceneName: string;
        cpuUsage?: number;
        fps?: number;
    }): void;
    handleObsStreamState(payload: {
        productionId: string;
        active: boolean;
        state: string;
    }): void;
    handleObsRecordState(payload: {
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
        isStreaming?: boolean;
        isRecording?: boolean;
        isExternal?: boolean;
        isMultiCorder?: boolean;
    }): void;
    handleVmixConnectionState(payload: {
        productionId: string;
        connected: boolean;
    }): void;
    handleTimelineUpdated(payload: {
        productionId: string;
    }): void;
}
