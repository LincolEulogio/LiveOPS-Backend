import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class PublicAnalyticsController {
    private readonly analyticsService;
    private readonly prisma;
    constructor(analyticsService: AnalyticsService, prisma: PrismaService);
    getPublicStatus(id: string): Promise<{
        productionName: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        engineType: import("@prisma/client").$Enums.EngineType;
        activeSegment: string;
        telemetry: {
            id: string;
            productionId: string;
            isStreaming: boolean;
            isRecording: boolean;
            cpuUsage: number | null;
            fps: number | null;
            timestamp: Date;
            memoryUsage: number | null;
            bitrate: number | null;
            droppedFrames: number | null;
        }[];
    }>;
}
