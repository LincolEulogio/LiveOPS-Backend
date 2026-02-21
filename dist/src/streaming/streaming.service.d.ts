import { PrismaService } from '../prisma/prisma.service';
import { ObsService } from '../obs/obs.service';
import { VmixService } from '../vmix/vmix.service';
import { StreamingCommandDto } from './dto/streaming-command.dto';
export declare class StreamingService {
    private prisma;
    private obsService;
    private vmixService;
    constructor(prisma: PrismaService, obsService: ObsService, vmixService: VmixService);
    getStreamingState(productionId: string): Promise<{
        productionId: string;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isConnected: boolean;
        obs: {
            currentScene?: string | undefined;
            scenes?: string[] | undefined;
            isStreaming?: boolean | undefined;
            isRecording?: boolean | undefined;
            cpuUsage?: number | undefined;
            fps?: number | undefined;
            isConnected: boolean;
        } | null;
        vmix: null;
        lastUpdate: string;
    }>;
    handleCommand(productionId: string, dto: StreamingCommandDto): Promise<{
        success: boolean;
    }>;
    private handleObsCommand;
    private handleVmixCommand;
}
