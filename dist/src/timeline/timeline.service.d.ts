import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateTimelineBlockDto, UpdateTimelineBlockDto } from './dto/timeline.dto';
export declare class TimelineService {
    private prisma;
    private eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    getBlocks(productionId: string): Promise<({
        intercomTemplate: {
            description: string | null;
            id: string;
            productionId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            icon: string | null;
            color: string | null;
        } | null;
    } & {
        title: string;
        description: string | null;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        notes: string | null;
        intercomTemplateId: string | null;
        id: string;
        productionId: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    createBlock(productionId: string, dto: CreateTimelineBlockDto): Promise<{
        title: string;
        description: string | null;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        notes: string | null;
        intercomTemplateId: string | null;
        id: string;
        productionId: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateBlock(id: string, productionId: string, dto: UpdateTimelineBlockDto): Promise<{
        title: string;
        description: string | null;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        notes: string | null;
        intercomTemplateId: string | null;
        id: string;
        productionId: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteBlock(id: string, productionId: string): Promise<{
        success: boolean;
    }>;
    reorderBlocks(productionId: string, blockIds: string[]): Promise<{
        success: boolean;
    }>;
    startBlock(id: string, productionId: string): Promise<{
        title: string;
        description: string | null;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        notes: string | null;
        intercomTemplateId: string | null;
        id: string;
        productionId: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    completeBlock(id: string, productionId: string): Promise<{
        title: string;
        description: string | null;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        notes: string | null;
        intercomTemplateId: string | null;
        id: string;
        productionId: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    resetBlock(id: string, productionId: string): Promise<{
        title: string;
        description: string | null;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        notes: string | null;
        intercomTemplateId: string | null;
        id: string;
        productionId: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private emitTimelineUpdated;
}
