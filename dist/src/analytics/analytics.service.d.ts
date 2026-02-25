import { PrismaService } from '../prisma/prisma.service';
import type { ProductionHealthStats } from '../obs/obs-connection.manager';
export declare class AnalyticsService {
    private prisma;
    private readonly logger;
    private lastWriteTime;
    private readonly WRITE_INTERVAL_MS;
    constructor(prisma: PrismaService);
    handleProductionHealthStats(payload: ProductionHealthStats): Promise<void>;
    getTelemetryLogs(productionId: string, minutes?: number): Promise<{
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
    generateShowReport(productionId: string): Promise<{
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
    getShowReport(productionId: string): Promise<{
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
}
