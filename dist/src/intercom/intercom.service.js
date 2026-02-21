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
exports.IntercomService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let IntercomService = class IntercomService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createTemplate(productionId, dto) {
        return this.prisma.commandTemplate.create({
            data: {
                productionId,
                name: dto.name,
                description: dto.description,
                icon: dto.icon,
                color: dto.color,
            }
        });
    }
    async getTemplates(productionId) {
        return this.prisma.commandTemplate.findMany({
            where: { productionId },
            orderBy: { createdAt: 'desc' }
        });
    }
    async deleteTemplate(id, productionId) {
        const template = await this.prisma.commandTemplate.findFirst({
            where: { id, productionId }
        });
        if (!template)
            throw new common_1.NotFoundException('Template not found in this production');
        return this.prisma.commandTemplate.delete({ where: { id } });
    }
    async getCommandHistory(productionId, limit = 50) {
        return this.prisma.command.findMany({
            where: { productionId },
            include: {
                sender: { select: { id: true, name: true } },
                targetRole: { select: { id: true, name: true } },
                template: true,
                responses: {
                    include: {
                        responder: { select: { id: true, name: true } }
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
};
exports.IntercomService = IntercomService;
exports.IntercomService = IntercomService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IntercomService);
//# sourceMappingURL=intercom.service.js.map