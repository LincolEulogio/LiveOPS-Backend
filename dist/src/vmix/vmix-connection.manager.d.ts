import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { EngineType } from '@prisma/client';
export interface VmixInput {
    number: number;
    title: string;
    type: string;
    state: string;
    key: string;
}
export declare class VmixConnectionManager implements OnModuleInit, OnModuleDestroy {
    private prisma;
    private eventEmitter;
    private readonly logger;
    private connections;
    private readonly POLLING_RATE_MS;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private loadAllConnections;
    connectVmix(productionId: string, url: string, pollingInterval?: number): void;
    private disconnectVmix;
    stopPolling(productionId: string): Promise<void>;
    private getApiUrl;
    private pollApi;
    getVmixState(productionId: string): {
        isConnected: boolean;
        activeInput?: undefined;
        previewInput?: undefined;
        isStreaming?: undefined;
        isRecording?: undefined;
        isExternal?: undefined;
        isMultiCorder?: undefined;
        inputs?: undefined;
        lastHeartbeat?: undefined;
        lastLatency?: undefined;
    } | {
        isConnected: boolean;
        activeInput: number | undefined;
        previewInput: number | undefined;
        isStreaming: boolean;
        isRecording: boolean;
        isExternal: boolean;
        isMultiCorder: boolean;
        inputs: VmixInput[];
        lastHeartbeat: string | undefined;
        lastLatency: number | undefined;
    };
    handleConnectionUpdate(payload: {
        productionId: string;
        type: EngineType;
        url: string;
        pollingInterval?: number;
    }): void;
    isConnected(productionId: string): boolean;
    sendCommand(productionId: string, command: string, params?: Record<string, string | number>): Promise<void>;
}
