import { StreamingService } from '@/streaming/streaming.service';
import { StreamingDestinationsService } from '@/streaming/streaming-destinations.service';
import { StreamingCommandDto } from '@/streaming/dto/streaming-command.dto';
import { CreateStreamingDestinationDto, UpdateStreamingDestinationDto } from '@/streaming/dto/streaming-destination.dto';
import { LiveKitService } from '@/streaming/livekit.service';
export declare class StreamingController {
    private readonly streamingService;
    private readonly destinationsService;
    private readonly liveKitService;
    constructor(streamingService: StreamingService, destinationsService: StreamingDestinationsService, liveKitService: LiveKitService);
    getToken(productionId: string, identity: string, name: string, isOperator?: boolean): Promise<{
        token: string;
        url: string;
    }>;
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
        vmix: {
            isConnected: boolean;
            activeInput?: undefined;
            previewInput?: undefined;
            isStreaming?: undefined;
            isRecording?: undefined;
            isExternal?: undefined;
            isMultiCorder?: undefined;
            inputs?: undefined;
            lastHeartbeat?: undefined;
            lastLatency?: undefined;
        } | {
            isConnected: boolean;
            activeInput: number | undefined;
            previewInput: number | undefined;
            isStreaming: boolean;
            isRecording: boolean;
            isExternal: boolean;
            isMultiCorder: boolean;
            inputs: import("../vmix/vmix-connection.manager").VmixInput[];
            lastHeartbeat: string | undefined;
            lastLatency: number | undefined;
        } | null;
        lastUpdate: string;
    }>;
    sendCommand(productionId: string, dto: StreamingCommandDto): Promise<{
        success: boolean;
    }>;
    getDestinations(productionId: string): Promise<{
        id: string;
        productionId: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }[]>;
    createDestination(productionId: string, dto: CreateStreamingDestinationDto): Promise<{
        id: string;
        productionId: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }>;
    updateDestination(id: string, dto: UpdateStreamingDestinationDto): Promise<{
        id: string;
        productionId: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }>;
    removeDestination(id: string): Promise<{
        id: string;
        productionId: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        platform: string;
        rtmpUrl: string;
        streamKey: string;
        isActive: boolean;
    }>;
}
