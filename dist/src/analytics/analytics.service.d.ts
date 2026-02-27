import { PrismaService } from '@/prisma/prisma.service';
import { AiService } from '@/ai/ai.service';
import type { ProductionHealthStats } from '@/streaming/streaming.types';
export declare class AnalyticsService {
    private prisma;
    private aiService;
    private readonly logger;
    private lastWriteTime;
    private readonly WRITE_INTERVAL_MS;
    constructor(prisma: PrismaService, aiService: AiService);
    handleProductionHealthStats(payload: ProductionHealthStats): Promise<void>;
    getTelemetryLogs(productionId: string, minutes?: number): Promise<{
        id: string;
        productionId: string;
        timestamp: Date;
        cpuUsage: number | null;
        memoryUsage: number | null;
        fps: number | null;
        bitrate: number | null;
        droppedFrames: number | null;
        isStreaming: boolean;
        isRecording: boolean;
    }[]>;
    generateShowReport(productionId: string): Promise<{
        id: string;
        productionId: string;
        generatedAt: Date;
        startTime: Date | null;
        endTime: Date | null;
        durationMs: number | null;
        peakViewers: number | null;
        alertsCount: number | null;
        metrics: import("@prisma/client/runtime/client").JsonValue | null;
        aiAnalysis: string | null;
    }>;
    getShowReport(productionId: string): Promise<{
        id: string;
        productionId: string;
        generatedAt: Date;
        startTime: Date | null;
        endTime: Date | null;
        durationMs: number | null;
        peakViewers: number | null;
        alertsCount: number | null;
        metrics: import("@prisma/client/runtime/client").JsonValue | null;
        aiAnalysis: string | null;
    } | null>;
}
