import { StreamingService } from './streaming.service';
import { StreamingCommandDto } from './dto/streaming-command.dto';
export declare class StreamingController {
    private readonly streamingService;
    constructor(streamingService: StreamingService);
    getState(productionId: string): Promise<{
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
    sendCommand(productionId: string, dto: StreamingCommandDto): Promise<{
        success: boolean;
    }>;
}
