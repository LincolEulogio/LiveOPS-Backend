import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHardwareMappingDto } from './dto/hardware-mapping.dto';

@Injectable()
export class HardwareService {
    constructor(private prisma: PrismaService) { }

    async getMappings(productionId: string) {
        return this.prisma.hardwareMapping.findMany({
            where: { productionId },
            include: { rule: true },
        });
    }

    async saveMapping(productionId: string, dto: CreateHardwareMappingDto) {
        return this.prisma.hardwareMapping.upsert({
            where: {
                productionId_mapKey: {
                    productionId,
                    mapKey: dto.mapKey,
                },
            },
            update: {
                ruleId: dto.ruleId,
            },
            create: {
                productionId,
                mapKey: dto.mapKey,
                ruleId: dto.ruleId,
            },
        });
    }

    async deleteMapping(productionId: string, mapKey: string) {
        const mapping = await this.prisma.hardwareMapping.findUnique({
            where: {
                productionId_mapKey: {
                    productionId,
                    mapKey,
                },
            },
        });

        if (!mapping) throw new NotFoundException('Mapping not found');

        return this.prisma.hardwareMapping.delete({
            where: {
                productionId_mapKey: {
                    productionId,
                    mapKey,
                },
            },
        });
    }
}
