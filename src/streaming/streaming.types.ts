import { EngineType } from '@prisma/client';

export interface ProductionHealthStats {
    productionId: string;
    engineType: EngineType;
    cpuUsage: number; // For vMix, this is vMix CPU usage
    fps: number;
    bitrate: number;
    skippedFrames: number;
    totalFrames: number;
    memoryUsage: number;
    availableDiskSpace?: number;
    isStreaming: boolean;
    isRecording: boolean;
    timestamp: string;
    // vmix specific
    renderTime?: number;
    gpuUsage?: number;
    totalCpuUsage?: number; // Total system CPU
    version?: string;
    edition?: string;
}
