import { PrismaService } from '../prisma/prisma.service';
import { VmixConnectionManager } from './vmix-connection.manager';
import { SaveVmixConnectionDto, ChangeInputDto } from './dto/vmix.dto';
export declare class VmixService {
    private prisma;
    private vmixManager;
    private readonly logger;
    constructor(prisma: PrismaService, vmixManager: VmixConnectionManager);
    saveConnection(productionId: string, dto: SaveVmixConnectionDto): Promise<{
        url: string;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isEnabled: boolean;
    }>;
    getConnection(productionId: string): Promise<{
        url: string;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isEnabled: boolean;
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
    fade(productionId: string): Promise<{
        success: boolean;
        action: string;
    }>;
}
