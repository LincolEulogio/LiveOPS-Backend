import { PrismaService } from '@/prisma/prisma.service';
import { VmixConnectionManager } from '@/vmix/vmix-connection.manager';
import { SaveVmixConnectionDto, ChangeInputDto } from '@/vmix/dto/vmix.dto';
import { AuditService } from '@/common/services/audit.service';
export declare class VmixService {
    private prisma;
    private vmixManager;
    private auditService;
    private readonly logger;
    constructor(prisma: PrismaService, vmixManager: VmixConnectionManager, auditService: AuditService);
    saveConnection(productionId: string, dto: SaveVmixConnectionDto): Promise<{
        id: string;
        productionId: string;
        url: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        pollingInterval: number;
    }>;
    getConnection(productionId: string): Promise<{
        id: string;
        productionId: string;
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
        inputs: import("@/vmix/vmix-connection.manager").VmixInput[];
        lastHeartbeat: string | undefined;
        lastLatency: number | undefined;
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
