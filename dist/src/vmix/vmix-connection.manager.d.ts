import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EngineType } from '../productions/dto/production.dto';
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
    private pollApi;
    handleConnectionUpdate(payload: {
        productionId: string;
        type: EngineType;
        url: string;
        pollingInterval?: number;
    }): void;
    isConnected(productionId: string): boolean;
    sendCommand(productionId: string, command: string, params?: Record<string, string | number>): Promise<void>;
}
