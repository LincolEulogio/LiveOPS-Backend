import { PrismaService } from '../prisma/prisma.service';
import { VmixConnectionManager } from './vmix-connection.manager';
import { SaveVmixConnectionDto, ChangeInputDto } from './dto/vmix.dto';
export declare class VmixService {
    private prisma;
    private vmixManager;
    private readonly logger;
    constructor(prisma: PrismaService, vmixManager: VmixConnectionManager);
    saveConnection(productionId: string, dto: SaveVmixConnectionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        url: string;
        productionId: string;
        isEnabled: boolean;
        pollingInterval: number;
    }>;
    getConnection(productionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        url: string;
        productionId: string;
        isEnabled: boolean;
        pollingInterval: number;
    }>;
    isConnected(productionId: string): boolean;
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
