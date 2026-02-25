import { HardwareService } from './hardware.service';
import { CreateHardwareMappingDto } from './dto/hardware-mapping.dto';
export declare class HardwareController {
    private readonly hardwareService;
    constructor(hardwareService: HardwareService);
    getMappings(productionId: string): Promise<({
        rule: {
            id: string;
            createdAt: Date;
            name: string;
            productionId: string;
            updatedAt: Date;
            description: string | null;
            isEnabled: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        productionId: string;
        updatedAt: Date;
        ruleId: string;
        mapKey: string;
    })[]>;
    saveMapping(productionId: string, dto: CreateHardwareMappingDto): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        updatedAt: Date;
        ruleId: string;
        mapKey: string;
    }>;
    deleteMapping(productionId: string, mapKey: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        updatedAt: Date;
        ruleId: string;
        mapKey: string;
    }>;
}
