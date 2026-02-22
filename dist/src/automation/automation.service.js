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
exports.AutomationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AutomationService = class AutomationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRules(productionId) {
        return this.prisma.rule.findMany({
            where: { productionId },
            include: {
                triggers: true,
                actions: { orderBy: { order: 'asc' } },
            },
        });
    }
    async getRule(id, productionId) {
        const rule = await this.prisma.rule.findFirst({
            where: { id, productionId },
            include: {
                triggers: true,
                actions: { orderBy: { order: 'asc' } },
                logs: { orderBy: { createdAt: 'desc' }, take: 20 },
            },
        });
        if (!rule)
            throw new common_1.NotFoundException('Rule not found');
        return rule;
    }
    async createRule(productionId, dto) {
        return this.prisma.rule.create({
            data: {
                productionId,
                name: dto.name,
                description: dto.description,
                isEnabled: dto.isEnabled ?? true,
                triggers: {
                    create: dto.triggers,
                },
                actions: {
                    create: dto.actions.map((a, idx) => ({
                        ...a,
                        order: a.order ?? idx,
                    })),
                },
            },
            include: { triggers: true, actions: true },
        });
    }
    async updateRule(id, productionId, dto) {
        const rule = await this.prisma.rule.findFirst({
            where: { id, productionId },
        });
        if (!rule)
            throw new common_1.NotFoundException('Rule not found');
        return this.prisma.rule.update({
            where: { id },
            data: dto,
        });
    }
    async deleteRule(id, productionId) {
        const rule = await this.prisma.rule.findFirst({
            where: { id, productionId },
        });
        if (!rule)
            throw new common_1.NotFoundException('Rule not found');
        await this.prisma.rule.delete({ where: { id } });
        return { success: true };
    }
    async getExecutionLogs(productionId) {
        return this.prisma.ruleExecutionLog.findMany({
            where: { productionId },
            include: { rule: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
};
exports.AutomationService = AutomationService;
exports.AutomationService = AutomationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AutomationService);
//# sourceMappingURL=automation.service.js.map