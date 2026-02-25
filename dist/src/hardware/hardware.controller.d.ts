import { HardwareService } from '@/hardware/hardware.service';
import { CreateHardwareMappingDto } from '@/hardware/dto/hardware-mapping.dto';
export declare class HardwareController {
    private readonly hardwareService;
    constructor(hardwareService: HardwareService);
    getMappings(productionId: string): Promise<({
        rule: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            productionId: string;
            isEnabled: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        ruleId: string;
        mapKey: string;
    })[]>;
    saveMapping(productionId: string, dto: CreateHardwareMappingDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        ruleId: string;
        mapKey: string;
    }>;
    deleteMapping(productionId: string, mapKey: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        ruleId: string;
        mapKey: string;
    }>;
}
