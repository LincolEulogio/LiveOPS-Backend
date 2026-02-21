import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import OBSWebSocket from 'obs-websocket-js';
import { PrismaService } from '../prisma/prisma.service';
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
    getInstance(productionId: string): OBSWebSocket | undefined;
}
