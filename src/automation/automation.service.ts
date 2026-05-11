import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateRuleDto,
  UpdateRuleFullDto,
  CreateActionDto,
  PaginationQueryDto,
} from '@/automation/dto/automation.dto';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiService } from '@/ai/ai.service';

@Injectable()
export class AutomationService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private aiService: AiService,
  ) {}

  async getRules(productionId: string, query: PaginationQueryDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.rule.findMany({
        where: { productionId },
        skip,
        take: limit,
        include: {
          triggers: true,
          actions: { orderBy: { order: 'asc' } },
        },
      }),
      this.prisma.rule.count({ where: { productionId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
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
          create: dto.triggers as Prisma.TriggerCreateWithoutRuleInput[],
        },
        actions: {
          create: dto.actions.map((a: CreateActionDto, idx: number) => ({
            ...a,
            order: a.order ?? idx,
          })) as Prisma.ActionCreateWithoutRuleInput[],
        },
      },
      include: { triggers: true, actions: true },
    });
  }

  async updateRule(id: string, productionId: string, dto: UpdateRuleFullDto) {
    const rule = await this.prisma.rule.findFirst({
      where: { id, productionId },
    });
    if (!rule) throw new NotFoundException('Rule not found');

    const { triggers, actions, ...basicData } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (triggers !== undefined) {
        await tx.trigger.deleteMany({ where: { ruleId: id } });
      }
      if (actions !== undefined) {
        await tx.action.deleteMany({ where: { ruleId: id } });
      }

      return tx.rule.update({
        where: { id },
        data: {
          ...basicData,
          ...(triggers !== undefined && {
            triggers: {
              create: triggers as Prisma.TriggerCreateWithoutRuleInput[],
            },
          }),
          ...(actions !== undefined && {
            actions: {
              create: actions.map(
                (a: CreateActionDto, idx: number) => ({
                  ...a,
                  order: a.order ?? idx,
                }),
              ) as Prisma.ActionCreateWithoutRuleInput[],
            },
          }),
        },
        include: {
          triggers: true,
          actions: { orderBy: { order: 'asc' } },
        },
      });
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

  async getExecutionLogs(productionId: string, query: PaginationQueryDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '50', 10);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.ruleExecutionLog.findMany({
        where: { productionId },
        skip,
        take: limit,
        include: { rule: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ruleExecutionLog.count({ where: { productionId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  triggerInstantClip(productionId: string) {
    // Simply emit the event that the engine is listening for
    this.eventEmitter.emit('manual.trigger', {
      productionId,
      actionType: 'engine.instantClip',
    });

    return { success: true, message: 'Instant clip triggered' };
  }

  async runRuleManual(productionId: string, ruleId: string) {
    const rule = await this.prisma.rule.findFirst({
      where: { id: ruleId, productionId },
    });
    if (!rule) throw new NotFoundException('Rule not found');

    // Emit event that the automation engine listens for
    this.eventEmitter.emit('manual.trigger', {
      productionId,
      ruleId,
      isManual: true,
    });

    return { success: true, message: `Macro "${rule.name}" triggered` };
  }

  async generateRuleAi(productionId: string, prompt: string) {
    const macro = await this.aiService.generateAutomationMacro(prompt);
    return this.createRule(productionId, macro as unknown as CreateRuleDto);
  }
}
