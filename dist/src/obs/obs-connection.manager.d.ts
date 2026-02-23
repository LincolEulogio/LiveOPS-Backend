import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import OBSWebSocket from 'obs-websocket-js';
import { PrismaService } from '../prisma/prisma.service';
import { EngineType } from '@prisma/client';
export interface ObsScene {
    sceneName: string;
    sceneIndex: number;
}
export interface ProductionHealthStats {
    productionId: string;
    engineType: EngineType;
    cpuUsage: number;
    fps: number;
    bitrate: number;
    skippedFrames: number;
    totalFrames: number;
    memoryUsage: number;
    isStreaming: boolean;
    isRecording: boolean;
    timestamp: string;
}
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
    private startStatsPolling;
    private stopStatsPolling;
    getInstance(productionId: string): OBSWebSocket | undefined;
    getObsState(productionId: string): {
        currentScene?: string | undefined;
        scenes?: string[] | undefined;
        isStreaming?: boolean | undefined;
        isRecording?: boolean | undefined;
        cpuUsage?: number | undefined;
        fps?: number | undefined;
        bitrate?: number;
        outputSkippedFrames?: number;
        outputTotalFrames?: number;
        isConnected: boolean;
    };
}
