import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateRuleDto,
  UpdateRuleFullDto,
  CreateActionDto,
  CreateTriggerDto,
  ImportRulesDto,
  PaginationQueryDto,
  TriggerConditionNode,
} from '@/automation/dto/automation.dto';
import { Prisma, Trigger } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiService } from '@/ai/ai.service';
import { AutomationEngineService } from '@/automation/automation-engine.service';

type ConditionValue = string | number | boolean | null;
type EventPayload = Record<string, ConditionValue>;

@Injectable()
export class AutomationService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private aiService: AiService,
    private engineService: AutomationEngineService,
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
          create: dto.triggers.map(
            (t: CreateTriggerDto): Prisma.TriggerCreateWithoutRuleInput => ({
              eventType: t.eventType,
              condition: t.condition as Prisma.InputJsonValue ?? Prisma.JsonNull,
            }),
          ),
        },
        actions: {
          create: dto.actions.map(
            (a: CreateActionDto, idx: number): Prisma.ActionCreateWithoutRuleInput => ({
              actionType: a.actionType,
              payload: (a.payload !== undefined
                ? { ...(a.payload as object), ...(a.delayMs ? { delayMs: a.delayMs } : {}) }
                : a.delayMs
                  ? { delayMs: a.delayMs }
                  : {}) as Prisma.InputJsonValue,
              order: a.order ?? idx,
            }),
          ),
        },
      },
      include: { triggers: true, actions: { orderBy: { order: 'asc' } } },
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
              create: triggers.map(
                (t): Prisma.TriggerCreateWithoutRuleInput => ({
                  eventType: t.eventType,
                  condition: t.condition as Prisma.InputJsonValue ?? Prisma.JsonNull,
                }),
              ),
            },
          }),
          ...(actions !== undefined && {
            actions: {
              create: actions.map(
                (a, idx): Prisma.ActionCreateWithoutRuleInput => ({
                  actionType: a.actionType,
                  payload: (a.payload !== undefined
                    ? { ...(a.payload as object), ...(a.delayMs ? { delayMs: a.delayMs } : {}) }
                    : a.delayMs
                      ? { delayMs: a.delayMs }
                      : {}) as Prisma.InputJsonValue,
                  order: a.order ?? idx,
                }),
              ),
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

  async getRuleLogs(id: string, productionId: string, query: PaginationQueryDto) {
    const rule = await this.prisma.rule.findFirst({
      where: { id, productionId },
    });
    if (!rule) throw new NotFoundException('Rule not found');

    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.ruleExecutionLog.findMany({
        where: { ruleId: id, productionId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ruleExecutionLog.count({ where: { ruleId: id, productionId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  /**
   * Simulates a rule execution against a mock event payload.
   * No actions are actually executed — returns what would happen.
   */
  async dryRunRule(
    id: string,
    productionId: string,
    mockPayload: EventPayload = {},
  ) {
    const rule = await this.prisma.rule.findFirst({
      where: { id, productionId },
      include: {
        triggers: true,
        actions: { orderBy: { order: 'asc' } },
      },
    });
    if (!rule) throw new NotFoundException('Rule not found');

    const testPayload = { productionId, ...mockPayload };

    const matchedTriggers = rule.triggers.filter((t: Trigger) => {
      if (!t.condition) return true;
      const node = t.condition as unknown as TriggerConditionNode;
      return this.engineService.evaluateConditionNode(node, testPayload);
    });

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      isEnabled: rule.isEnabled,
      wouldExecute: rule.isEnabled && matchedTriggers.length > 0,
      matchedTriggers,
      actions: rule.actions,
      mockPayload: testPayload,
      note: 'Dry-run simulation — no actions were executed.',
    };
  }

  /**
   * Exports all rules for a production as clean JSON (no DB-generated IDs).
   */
  async exportRules(productionId: string) {
    const rules = await this.prisma.rule.findMany({
      where: { productionId },
      include: {
        triggers: true,
        actions: { orderBy: { order: 'asc' } },
      },
    });

    return rules.map((r) => ({
      name: r.name,
      description: r.description,
      isEnabled: r.isEnabled,
      triggers: r.triggers.map((t) => ({
        eventType: t.eventType,
        condition: t.condition,
      })),
      actions: r.actions.map((a) => ({
        actionType: a.actionType,
        payload: a.payload,
        order: a.order,
      })),
    }));
  }

  /**
   * Imports a list of rule definitions, creating them under the given production.
   */
  async importRules(productionId: string, dto: ImportRulesDto) {
    const created = await Promise.all(
      dto.rules.map((rule) => this.createRule(productionId, rule)),
    );
    return { imported: created.length, rules: created };
  }

  triggerInstantClip(productionId: string) {
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
