"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardwareService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let HardwareService = class HardwareService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMappings(productionId) {
        return this.prisma.hardwareMapping.findMany({
            where: { productionId },
            include: { rule: true },
        });
    }
    async saveMapping(productionId, dto) {
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
    async deleteMapping(productionId, mapKey) {
        const mapping = await this.prisma.hardwareMapping.findUnique({
            where: {
                productionId_mapKey: {
                    productionId,
                    mapKey,
                },
            },
        });
        if (!mapping)
            throw new common_1.NotFoundException('Mapping not found');
        return this.prisma.hardwareMapping.delete({
            where: {
                productionId_mapKey: {
                    productionId,
                    mapKey,
                },
            },
        });
    }
};
exports.HardwareService = HardwareService;
exports.HardwareService = HardwareService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HardwareService);
//# sourceMappingURL=hardware.service.js.map