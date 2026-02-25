import { PrismaService } from '@/prisma/prisma.service';
import { CreateHardwareMappingDto } from '@/hardware/dto/hardware-mapping.dto';
export declare class HardwareService {
    private prisma;
    constructor(prisma: PrismaService);
    getMappings(productionId: string): Promise<({
        rule: {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
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
