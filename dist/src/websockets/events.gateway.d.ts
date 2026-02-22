import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { IntercomService } from '../intercom/intercom.service';
import { ChatService } from '../chat/chat.service';
import { ScriptService } from '../script/script.service';
export declare class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private prisma;
    private eventEmitter;
    private intercomService;
    private chatService;
    private scriptService;
    server: Server;
    private logger;
    private activeUsers;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2, intercomService: IntercomService, chatService: ChatService, scriptService: ScriptService);
    afterInit(server: Server): void;
    handleChatSend(data: {
        productionId: string;
        userId: string;
        message: string;
    }, client: Socket): Promise<{
        status: string;
        messageId: string;
    }>;
    handleProductionJoin(data: {
        productionId: string;
    }, client: Socket): Promise<{
        status: string;
        room: string;
    }>;
    handleProductionLeave(data: {
        productionId: string;
    }, client: Socket): Promise<{
        status: string;
        room: string;
    }>;
    handleChatTyping(data: {
        productionId: string;
        userId: string;
        userName: string;
        isTyping: boolean;
    }, client: Socket): void;
    handleScriptSync(data: {
        productionId: string;
    }, client: Socket): Promise<void>;
    handleScriptUpdate(data: {
        productionId: string;
        update: number[];
    }, client: Socket): Promise<void>;
    handleAwarenessUpdate(data: {
        productionId: string;
        update: number[];
    }, client: Socket): void;
    handleWebRTCSignal(data: {
        productionId: string;
        targetUserId: string;
        signal: any;
    }, client: Socket): void;
    handleSocialOverlay(data: {
        productionId: string;
        comment: any | null;
    }, client: Socket): void;
    handleScriptScrollSync(data: {
        productionId: string;
        scrollPercentage: number;
    }, client: Socket): void;
    handleConnection(client: Socket, ...args: any[]): Promise<void>;
    private broadcastPresence;
    handleDisconnect(client: Socket): void;
    handleUserIdentify(data: {
        userId: string;
        userName: string;
        roleId: string;
        roleName: string;
        productionId: string;
    }, client: Socket): {
        status: string;
    };
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
    }): Promise<void>;
    handleObsStreamState(payload: {
        productionId: string;
        active: boolean;
        state: string;
    }): Promise<void>;
    handleObsRecordState(payload: {
        productionId: string;
        active: boolean;
        state: string;
    }): Promise<void>;
    handleObsConnectionState(payload: {
        productionId: string;
        connected: boolean;
    }): Promise<void>;
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
    handleCommandCreated(payload: {
        productionId: string;
        command: any;
    }): void;
    handleProductionHealthStats(payload: any): void;
    handleSocialOverlayUpdate(payload: {
        productionId: string;
        comment: any | null;
    }): void;
}
