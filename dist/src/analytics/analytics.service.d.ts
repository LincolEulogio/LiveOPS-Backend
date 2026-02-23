import { PrismaService } from '../prisma/prisma.service';
import { EngineType } from '@prisma/client';
export declare class AnalyticsService {
    private prisma;
    private readonly logger;
    private lastWriteTime;
    private readonly WRITE_INTERVAL_MS;
    constructor(prisma: PrismaService);
    handleProductionHealthStats(payload: {
        productionId: string;
        engine: EngineType;
        stats: any;
    }): Promise<void>;
    getTelemetryLogs(productionId: string, minutes?: number): Promise<{
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
    }[]>;
    generateShowReport(productionId: string): Promise<{
        id: string;
        productionId: string;
        durationMs: number | null;
        startTime: Date | null;
        endTime: Date | null;
        generatedAt: Date;
        peakViewers: number | null;
        alertsCount: number | null;
        metrics: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    getShowReport(productionId: string): Promise<{
        id: string;
        productionId: string;
        durationMs: number | null;
        startTime: Date | null;
        endTime: Date | null;
        generatedAt: Date;
        peakViewers: number | null;
        alertsCount: number | null;
        metrics: import("@prisma/client/runtime/client").JsonValue | null;
    } | null>;
}
