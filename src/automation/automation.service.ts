import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto, UpdateRuleDto } from './dto/automation.dto';

@Injectable()
export class AutomationService {
  constructor(private prisma: PrismaService) { }

  async getRules(productionId: string) {
    return this.prisma.rule.findMany({
      where: { productionId },
      include: {
        triggers: true,
        actions: { orderBy: { order: 'asc' } },
      },
    });
  }

  async getRule(id: string, productionId: string) {
    const rule = await this.prisma.rule.findFirst({
      where: { id, productionId },
      include: {
        triggers: true,
        actions: { orderBy: { order: 'asc' } },
        executionLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }

  async createRule(productionId: string, dto: CreateRuleDto) {
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

  async updateRule(id: string, productionId: string, dto: UpdateRuleDto) {
    // Basic update for name/description/isEnabled.
    // Triggers and Actions would need separate endpoints or a more complex sync logic.
    const rule = await this.prisma.rule.findFirst({
      where: { id, productionId },
    });
    if (!rule) throw new NotFoundException('Rule not found');

    return this.prisma.rule.update({
      where: { id },
      data: dto,
    });
  }

  async deleteRule(id: string, productionId: string) {
    const rule = await this.prisma.rule.findFirst({
      where: { id, productionId },
    });
    if (!rule) throw new NotFoundException('Rule not found');

    await this.prisma.rule.delete({ where: { id } });
    return { success: true };
  }

  async getExecutionLogs(productionId: string) {
    return this.prisma.ruleExecutionLog.findMany({
      where: { productionId },
      include: { rule: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
