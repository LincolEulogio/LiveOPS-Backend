import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getTelemetry(id: string, minutes?: string): Promise<{
        productionId: string;
        id: string;
        isStreaming: boolean;
        isRecording: boolean;
        cpuUsage: number | null;
        fps: number | null;
        timestamp: Date;
        memoryUsage: number | null;
        bitrate: number | null;
        droppedFrames: number | null;
    }[]>;
    getReport(id: string): Promise<{
        productionId: string;
        id: string;
        durationMs: number | null;
        startTime: Date | null;
        endTime: Date | null;
        generatedAt: Date;
        peakViewers: number | null;
        alertsCount: number | null;
        metrics: import("@prisma/client/runtime/client").JsonValue | null;
    } | null>;
    generateReport(id: string): Promise<{
        productionId: string;
        id: string;
        durationMs: number | null;
        startTime: Date | null;
        endTime: Date | null;
        generatedAt: Date;
        peakViewers: number | null;
        alertsCount: number | null;
        metrics: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
}
