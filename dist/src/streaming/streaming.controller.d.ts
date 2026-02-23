import { StreamingService } from './streaming.service';
import { StreamingDestinationsService } from './streaming-destinations.service';
import { StreamingCommandDto } from './dto/streaming-command.dto';
import { CreateStreamingDestinationDto, UpdateStreamingDestinationDto } from './dto/streaming-destination.dto';
export declare class StreamingController {
    private readonly streamingService;
    private readonly destinationsService;
    constructor(streamingService: StreamingService, destinationsService: StreamingDestinationsService);
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
            bitrate?: number;
            outputSkippedFrames?: number;
            outputTotalFrames?: number;
            isConnected: boolean;
        } | null;
        vmix: null;
        lastUpdate: string;
    }>;
    sendCommand(productionId: string, dto: StreamingCommandDto): Promise<{
        success: boolean;
    }>;
    getDestinations(productionId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        isEnabled: boolean;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }[]>;
    createDestination(productionId: string, dto: CreateStreamingDestinationDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        isEnabled: boolean;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }>;
    updateDestination(id: string, dto: UpdateStreamingDestinationDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        isEnabled: boolean;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }>;
    removeDestination(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        isEnabled: boolean;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }>;
}
