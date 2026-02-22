import { VmixService } from './vmix.service';
import { SaveVmixConnectionDto, ChangeInputDto } from './dto/vmix.dto';
export declare class VmixController {
    private readonly vmixService;
    constructor(vmixService: VmixService);
    saveConnection(productionId: string, dto: SaveVmixConnectionDto): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isEnabled: boolean;
        pollingInterval: number;
        url: string;
    }>;
    getConnection(productionId: string): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isEnabled: boolean;
        pollingInterval: number;
        url: string;
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
