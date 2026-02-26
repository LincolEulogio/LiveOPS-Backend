import { TimelineService } from '@/timeline/timeline.service';
import { CreateTimelineBlockDto, UpdateTimelineBlockDto, ReorderBlocksDto } from '@/timeline/dto/timeline.dto';
export declare class TimelineController {
    private readonly timelineService;
    constructor(timelineService: TimelineService);
    getBlocks(productionId: string): Promise<({
        intercomTemplate: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            productionId: string;
            icon: string | null;
            color: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        status: import("@prisma/client").$Enums.BlockStatus;
        productionId: string;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        notes: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    })[]>;
    createBlock(productionId: string, dto: CreateTimelineBlockDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        status: import("@prisma/client").$Enums.BlockStatus;
        productionId: string;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        notes: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    reorderBlocks(productionId: string, dto: ReorderBlocksDto): Promise<{
        success: boolean;
    }>;
    updateBlock(productionId: string, id: string, dto: UpdateTimelineBlockDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        status: import("@prisma/client").$Enums.BlockStatus;
        productionId: string;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        notes: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    deleteBlock(productionId: string, id: string): Promise<{
        success: boolean;
    }>;
    startBlock(productionId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        status: import("@prisma/client").$Enums.BlockStatus;
        productionId: string;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        notes: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    completeBlock(productionId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        status: import("@prisma/client").$Enums.BlockStatus;
        productionId: string;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        notes: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    resetBlock(productionId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        status: import("@prisma/client").$Enums.BlockStatus;
        productionId: string;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        notes: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
}
