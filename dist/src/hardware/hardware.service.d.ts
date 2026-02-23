import { PrismaService } from '../prisma/prisma.service';
import { CreateHardwareMappingDto } from './dto/hardware-mapping.dto';
export declare class HardwareService {
    private prisma;
    constructor(prisma: PrismaService);
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
