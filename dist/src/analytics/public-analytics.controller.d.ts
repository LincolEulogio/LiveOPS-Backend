import { AnalyticsService } from '@/analytics/analytics.service';
import { PrismaService } from '@/prisma/prisma.service';
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
            productionId: string;
            id: string;
            timestamp: Date;
            cpuUsage: number | null;
            memoryUsage: number | null;
            fps: number | null;
            bitrate: number | null;
            droppedFrames: number | null;
            isStreaming: boolean;
            isRecording: boolean;
        }[];
    }>;
}
