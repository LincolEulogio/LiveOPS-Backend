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
            name: string;
            description: string | null;
            icon: string | null;
            color: string | null;
            productionId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BlockStatus;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    })[]>;
    createBlock(productionId: string, dto: CreateTimelineBlockDto): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BlockStatus;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    updateBlock(id: string, productionId: string, dto: UpdateTimelineBlockDto): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BlockStatus;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    deleteBlock(id: string, productionId: string): Promise<{
        success: boolean;
    }>;
    reorderBlocks(productionId: string, blockIds: string[]): Promise<{
        success: boolean;
    }>;
    startBlock(id: string, productionId: string): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BlockStatus;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    completeBlock(id: string, productionId: string): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BlockStatus;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    resetBlock(id: string, productionId: string): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BlockStatus;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    private emitTimelineUpdated;
}
