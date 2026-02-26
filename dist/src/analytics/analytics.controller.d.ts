import { AnalyticsService } from '@/analytics/analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getTelemetry(id: string, minutes?: string): Promise<{
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
    }[]>;
    getReport(id: string): Promise<{
        productionId: string;
        id: string;
        generatedAt: Date;
        startTime: Date | null;
        endTime: Date | null;
        durationMs: number | null;
        peakViewers: number | null;
        alertsCount: number | null;
        metrics: import("@prisma/client/runtime/client").JsonValue | null;
        aiAnalysis: string | null;
    } | null>;
    generateReport(id: string): Promise<{
        productionId: string;
        id: string;
        generatedAt: Date;
        startTime: Date | null;
        endTime: Date | null;
        durationMs: number | null;
        peakViewers: number | null;
        alertsCount: number | null;
        metrics: import("@prisma/client/runtime/client").JsonValue | null;
        aiAnalysis: string | null;
    }>;
}
