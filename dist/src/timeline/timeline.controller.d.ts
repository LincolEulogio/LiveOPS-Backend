import { TimelineService } from './timeline.service';
import { CreateTimelineBlockDto, UpdateTimelineBlockDto, ReorderBlocksDto } from './dto/timeline.dto';
export declare class TimelineController {
    private readonly timelineService;
    constructor(timelineService: TimelineService);
    getBlocks(productionId: string): Promise<({
        intercomTemplate: {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            icon: string | null;
            color: string | null;
            productionId: string;
        } | null;
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    })[]>;
    createBlock(productionId: string, dto: CreateTimelineBlockDto): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    reorderBlocks(productionId: string, dto: ReorderBlocksDto): Promise<{
        success: boolean;
    }>;
    updateBlock(productionId: string, id: string, dto: UpdateTimelineBlockDto): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    deleteBlock(productionId: string, id: string): Promise<{
        success: boolean;
    }>;
    startBlock(productionId: string, id: string): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    completeBlock(productionId: string, id: string): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    resetBlock(productionId: string, id: string): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        source: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
}
