import { TimelineService } from './timeline.service';
import { CreateTimelineBlockDto, UpdateTimelineBlockDto, ReorderBlocksDto } from './dto/timeline.dto';
export declare class TimelineController {
    private readonly timelineService;
    constructor(timelineService: TimelineService);
    getBlocks(productionId: string): Promise<({
        intercomTemplate: {
            id: string;
            productionId: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            icon: string | null;
            color: string | null;
        } | null;
    } & {
        id: string;
        productionId: string;
        title: string;
        description: string | null;
        source: string | null;
        notes: string | null;
        durationMs: number;
        status: import("@prisma/client").$Enums.BlockStatus;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    createBlock(productionId: string, dto: CreateTimelineBlockDto): Promise<{
        id: string;
        productionId: string;
        title: string;
        description: string | null;
        source: string | null;
        notes: string | null;
        durationMs: number;
        status: import("@prisma/client").$Enums.BlockStatus;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    reorderBlocks(productionId: string, dto: ReorderBlocksDto): Promise<{
        success: boolean;
    }>;
    updateBlock(productionId: string, id: string, dto: UpdateTimelineBlockDto): Promise<{
        id: string;
        productionId: string;
        title: string;
        description: string | null;
        source: string | null;
        notes: string | null;
        durationMs: number;
        status: import("@prisma/client").$Enums.BlockStatus;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteBlock(productionId: string, id: string): Promise<{
        success: boolean;
    }>;
    startBlock(productionId: string, id: string): Promise<{
        id: string;
        productionId: string;
        title: string;
        description: string | null;
        source: string | null;
        notes: string | null;
        durationMs: number;
        status: import("@prisma/client").$Enums.BlockStatus;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    completeBlock(productionId: string, id: string): Promise<{
        id: string;
        productionId: string;
        title: string;
        description: string | null;
        source: string | null;
        notes: string | null;
        durationMs: number;
        status: import("@prisma/client").$Enums.BlockStatus;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    resetBlock(productionId: string, id: string): Promise<{
        id: string;
        productionId: string;
        title: string;
        description: string | null;
        source: string | null;
        notes: string | null;
        durationMs: number;
        status: import("@prisma/client").$Enums.BlockStatus;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
