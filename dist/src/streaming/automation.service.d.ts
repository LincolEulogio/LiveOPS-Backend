import { StreamingService } from './streaming.service';
export declare class AutomationService {
    private streamingService;
    private readonly logger;
    constructor(streamingService: StreamingService);
    handleBlockStarted(payload: {
        productionId: string;
        blockId: string;
        linkedScene?: string;
    }): Promise<void>;
}
