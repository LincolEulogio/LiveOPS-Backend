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
exports.OverlaysService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let OverlaysService = class OverlaysService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(productionId, dto) {
        return this.prisma.overlayTemplate.create({
            data: {
                ...dto,
                productionId,
            },
        });
    }
    async findAll(productionId) {
        return this.prisma.overlayTemplate.findMany({
            where: { productionId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const overlay = await this.prisma.overlayTemplate.findUnique({
            where: { id },
        });
        if (!overlay)
            throw new common_1.NotFoundException('Overlay not found');
        return overlay;
    }
    async update(id, dto) {
        return this.prisma.overlayTemplate.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id) {
        return this.prisma.overlayTemplate.delete({
            where: { id },
        });
    }
    async toggleActive(id, productionId, isActive) {
        if (isActive) {
            await this.prisma.overlayTemplate.updateMany({
                where: { productionId },
                data: { isActive: false },
            });
        }
        return this.prisma.overlayTemplate.update({
            where: { id },
            data: { isActive },
        });
    }
};
exports.OverlaysService = OverlaysService;
exports.OverlaysService = OverlaysService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OverlaysService);
//# sourceMappingURL=overlays.service.js.map