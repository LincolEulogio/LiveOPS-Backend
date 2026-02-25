import { PrismaService } from '@/prisma/prisma.service';
import { ObsConnectionManager } from '@/obs/obs-connection.manager';
import { SaveObsConnectionDto, ChangeSceneDto } from '@/obs/dto/obs.dto';
import { AuditService } from '@/common/services/audit.service';
export declare class ObsService {
    private prisma;
    private obsManager;
    private auditService;
    private readonly logger;
    constructor(prisma: PrismaService, obsManager: ObsConnectionManager, auditService: AuditService);
    saveConnection(productionId: string, dto: SaveObsConnectionDto): Promise<{
        id: string;
        password: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        url: string;
        isEnabled: boolean;
    }>;
    getConnection(productionId: string): Promise<{
        id: string;
        password: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        url: string;
        isEnabled: boolean;
    }>;
    isConnected(productionId: string): boolean;
    getRealTimeState(productionId: string): Promise<{
        currentScene?: string | undefined;
        scenes?: string[] | undefined;
        isStreaming?: boolean | undefined;
        isRecording?: boolean | undefined;
        cpuUsage?: number | undefined;
        fps?: number | undefined;
        bitrate?: number;
        outputSkippedFrames?: number;
        outputTotalFrames?: number;
        isConnected: boolean;
    }>;
    private getObs;
    changeScene(productionId: string, dto: ChangeSceneDto): Promise<{
        success: boolean;
        sceneName: string;
    }>;
    startStream(productionId: string): Promise<{
        success: boolean;
    }>;
    stopStream(productionId: string): Promise<{
        success: boolean;
    }>;
    startRecord(productionId: string): Promise<{
        success: boolean;
    }>;
    stopRecord(productionId: string): Promise<{
        success: boolean;
    }>;
    saveReplayBuffer(productionId: string): Promise<{
        success: boolean;
    }>;
}
