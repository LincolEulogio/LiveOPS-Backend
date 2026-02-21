import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import OBSWebSocket from 'obs-websocket-js';
import { PrismaService } from '../prisma/prisma.service';
import { EngineType } from '../productions/dto/production.dto';
export declare class ObsConnectionManager implements OnModuleInit, OnModuleDestroy {
    private prisma;
    private eventEmitter;
    private readonly logger;
    private connections;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private loadAllConnections;
    connectObs(productionId: string, url: string, password?: string): Promise<void>;
    private disconnectInstance;
    disconnectObs(productionId: string): Promise<void>;
    private scheduleReconnect;
    handleConnectionUpdate(payload: {
        productionId: string;
        type: EngineType;
        url: string;
        password?: string;
    }): void;
    getInstance(productionId: string): OBSWebSocket | undefined;
    getObsState(productionId: string): {
        currentScene?: string | undefined;
        scenes?: string[] | undefined;
        isStreaming?: boolean | undefined;
        isRecording?: boolean | undefined;
        cpuUsage?: number | undefined;
        fps?: number | undefined;
        isConnected: boolean;
    };
}
