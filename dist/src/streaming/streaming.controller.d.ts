import { StreamingService } from './streaming.service';
import { StreamingCommandDto } from './dto/streaming-command.dto';
export declare class StreamingController {
    private readonly streamingService;
    constructor(streamingService: StreamingService);
    getState(productionId: string): Promise<{
        productionId: string;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        lastUpdate: string;
    }>;
    sendCommand(productionId: string, dto: StreamingCommandDto): Promise<{
        success: boolean;
    }>;
}
