import { TimelineService } from './timeline.service';
import { CreateTimelineBlockDto, UpdateTimelineBlockDto, ReorderBlocksDto } from './dto/timeline.dto';
export declare class TimelineController {
    private readonly timelineService;
    constructor(timelineService: TimelineService);
    getBlocks(productionId: string): Promise<({
        intercomTemplate: {
            description: string | null;
            productionId: string;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            icon: string | null;
            color: string | null;
        } | null;
    } & {
        description: string | null;
        productionId: string;
        id: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        createdAt: Date;
        updatedAt: Date;
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
        status: import("@prisma/client").$Enums.BlockStatus;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    reorderBlocks(productionId: string, dto: ReorderBlocksDto): Promise<{
        success: boolean;
    }>;
    updateBlock(productionId: string, id: string, dto: UpdateTimelineBlockDto): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    deleteBlock(productionId: string, id: string): Promise<{
        success: boolean;
    }>;
    startBlock(productionId: string, id: string): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    completeBlock(productionId: string, id: string): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    resetBlock(productionId: string, id: string): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        status: import("@prisma/client").$Enums.BlockStatus;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        durationMs: number;
        order: number;
        linkedScene: string | null;
        intercomTemplateId: string | null;
        startTime: Date | null;
        endTime: Date | null;
    }>;
}
