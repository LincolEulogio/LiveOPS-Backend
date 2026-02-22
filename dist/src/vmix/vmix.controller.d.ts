import { VmixService } from './vmix.service';
import { SaveVmixConnectionDto, ChangeInputDto } from './dto/vmix.dto';
export declare class VmixController {
    private readonly vmixService;
    constructor(vmixService: VmixService);
    saveConnection(productionId: string, dto: SaveVmixConnectionDto): Promise<{
        url: string;
        id: string;
        productionId: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        pollingInterval: number;
    }>;
    getConnection(productionId: string): Promise<{
        url: string;
        id: string;
        productionId: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        pollingInterval: number;
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
        duration: number | undefined;
    }>;
}
