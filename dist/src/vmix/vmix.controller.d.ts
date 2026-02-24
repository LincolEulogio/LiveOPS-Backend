import { VmixService } from './vmix.service';
import { SaveVmixConnectionDto, ChangeInputDto } from './dto/vmix.dto';
export declare class VmixController {
    private readonly vmixService;
    constructor(vmixService: VmixService);
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
