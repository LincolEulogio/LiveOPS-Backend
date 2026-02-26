import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { IntercomService } from '@/intercom/intercom.service';
import { ChatService } from '@/chat/chat.service';
import { ScriptService } from '@/script/script.service';
import type { WebRTCSignalPayload } from '@/common/types/webrtc.types';
interface SocialComment {
    id: string;
    author: string;
    content: string;
    platform: string;
    avatarUrl?: string;
    timestamp: string;
}
interface IntercomCommand {
    id: string;
    productionId: string;
    senderId: string;
    targetUserId?: string;
    targetRoleId?: string;
    templateId?: string;
    message: string;
    requiresAck?: boolean;
    createdAt: string;
    status?: string;
    sender?: {
        id: string;
        name: string;
    };
}
interface HealthStatsPayload {
    productionId: string;
    cpuUsage: number;
    memoryUsage: number;
    bitrate: number;
    fps: number;
    skippedFrames: number;
    timestamp: string;
}
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
        commandId: string;
        messageId?: undefined;
    } | {
        status: string;
        messageId: string;
        commandId?: undefined;
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
    handleWebRTCSignal(data: WebRTCSignalPayload, client: Socket): void;
    handleWebRTCTalking(data: {
        productionId: string;
        isTalking: boolean;
        targetUserId?: string | null;
    }, client: Socket): void;
    handleSocialOverlay(data: {
        productionId: string;
        comment: SocialComment | null;
    }, client: Socket): void;
    handleScriptScrollSync(data: {
        productionId: string;
        scrollPercentage: number;
    }, client: Socket): void;
    handleHardwareTrigger(data: {
        productionId: string;
        mapKey: string;
    }): void;
    handleConnection(client: Socket): Promise<void>;
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
    handleChatDirect(data: {
        productionId: string;
        senderId: string;
        targetUserId: string;
        message: string;
        senderName?: string;
    }, client: Socket): Promise<{
        status: string;
        messageId: string;
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
    handleVmixInputChanged(payload: any): void;
    private broadcastTallyState;
    handleVmixConnectionState(payload: {
        productionId: string;
        connected: boolean;
    }): void;
    handleTimelineUpdated(payload: {
        productionId: string;
    }): void;
    handleCommandCreated(payload: {
        productionId: string;
        command: IntercomCommand;
    }): void;
    handleProductionHealthStats(payload: HealthStatsPayload): void;
    handleSocialOverlayUpdate(payload: {
        productionId: string;
        comment: SocialComment | null;
    }): void;
    handleSocialMessageNew(payload: SocialComment & {
        productionId: string;
    }): void;
    handleSocialMessageUpdated(payload: SocialComment & {
        productionId: string;
    }): void;
    handleSocialPollCreated(payload: {
        productionId: string;
        [key: string]: unknown;
    }): void;
    handleSocialPollUpdated(payload: {
        productionId: string;
        [key: string]: unknown;
    }): void;
    handleSocialPollClosed(payload: {
        productionId: string;
        [key: string]: unknown;
    }): void;
    handleGraphicsSocialShow(payload: {
        productionId: string;
        comment: SocialComment;
    }): void;
    handleGraphicsSocialHide(payload: {
        productionId: string;
    }): void;
    handleOverlayBroadcastData(payload: {
        productionId: string;
        data: Record<string, any>;
    }): void;
    handleOverlayTemplateUpdated(payload: {
        productionId: string;
        template: any;
    }): void;
    handleOverlayListUpdated(payload: {
        productionId: string;
    }): void;
    handleProductionUpdated(payload: {
        productionId: string;
    }): void;
}
export {};
