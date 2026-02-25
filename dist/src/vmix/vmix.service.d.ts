import { PrismaService } from '../prisma/prisma.service';
import { VmixConnectionManager } from './vmix-connection.manager';
import { SaveVmixConnectionDto, ChangeInputDto } from './dto/vmix.dto';
export declare class VmixService {
    private prisma;
    private vmixManager;
    private readonly logger;
    constructor(prisma: PrismaService, vmixManager: VmixConnectionManager);
    saveConnection(productionId: string, dto: SaveVmixConnectionDto): Promise<{
        productionId: string;
        id: string;
        url: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        pollingInterval: number;
    }>;
    getConnection(productionId: string): Promise<{
        productionId: string;
        id: string;
        url: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        pollingInterval: number;
    }>;
    isConnected(productionId: string): boolean;
    getRealTimeState(productionId: string): Promise<{
        isConnected: boolean;
        activeInput?: undefined;
        previewInput?: undefined;
        isStreaming?: undefined;
        isRecording?: undefined;
        isExternal?: undefined;
        isMultiCorder?: undefined;
        inputs?: undefined;
    } | {
        isConnected: boolean;
        activeInput: number | undefined;
        previewInput: number | undefined;
        isStreaming: boolean;
        isRecording: boolean;
        isExternal: boolean;
        isMultiCorder: boolean;
        inputs: import("./vmix-connection.manager").VmixInput[];
    }>;
    changeInput(productionId: string, dto: ChangeInputDto): Promise<{
        success: boolean;
        input: number;
        action: string;
    }>;
    cut(productionId: string): Promise<{
        success: boolean;
        action: string;
    }>;
    fade(productionId: string, dto?: {
        duration?: number;
    }): Promise<{
        success: boolean;
        action: string;
        duration: number | undefined;
    }>;
    saveVideoDelay(productionId: string): Promise<{
        success: boolean;
        action: string;
    }>;
}
