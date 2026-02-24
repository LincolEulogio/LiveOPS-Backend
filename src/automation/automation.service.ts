import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto, UpdateRuleDto } from './dto/automation.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AutomationService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) { }

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
          create: dto.triggers as any,
        },
        actions: {
          create: dto.actions.map((a: any, idx: number) => ({
            ...a,
            order: a.order ?? idx,
          })) as any,
        },
      },
      include: { triggers: true, actions: true },
    });
  }

  async updateRule(id: string, productionId: string, dto: UpdateRuleDto) {
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

  async triggerInstantClip(productionId: string) {
    // Simply emit the event that the engine is listening for
    this.eventEmitter.emit('manual.trigger', {
      productionId,
      actionType: 'engine.instantClip',
    });

    return { success: true, message: 'Instant clip triggered' };
  }
}
