import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateRuleDto,
  UpdateRuleFullDto,
  CreateActionDto,
  CreateTriggerDto,
  ImportRulesDto,
  PaginationQueryDto,
  TriggerConditionNode,
  TRIGGER_EVENT_TYPES,
  ACTION_TYPES,
} from '@/automation/dto/automation.dto';
import { Prisma, Trigger } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiService } from '@/ai/ai.service';
import { AutomationEngineService } from '@/automation/automation-engine.service';
import { AutomationConditionEvaluator } from '@/automation/automation-condition.evaluator';
import { AuditService } from '@/common/services/audit.service';

type ConditionValue = string | number | boolean | null;
type EventPayload = Record<string, ConditionValue>;

@Injectable()
export class AutomationService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private aiService: AiService,
    private engineService: AutomationEngineService,
    private conditionEvaluator: AutomationConditionEvaluator,
    private auditService: AuditService,
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

  private buildRuleData(productionId: string, dto: CreateRuleDto): Prisma.RuleCreateInput {
    return {
      production: { connect: { id: productionId } },
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
    };
  }

  async createRule(productionId: string, dto: CreateRuleDto) {
    return this.prisma.rule.create({
      data: this.buildRuleData(productionId, dto),
      include: { triggers: true, actions: { orderBy: { order: 'asc' } } },
    });
  }

  async updateRule(id: string, productionId: string, dto: UpdateRuleFullDto) {
    const rule = await this.prisma.rule.findFirst({
      where: { id, productionId },
      include: { triggers: true, actions: { orderBy: { order: 'asc' } } },
    });
    if (!rule) throw new NotFoundException('Rule not found');

    // Snapshot before state for audit trail
    const before = {
      name: rule.name,
      description: rule.description,
      isEnabled: rule.isEnabled,
      triggers: rule.triggers.map((t) => ({ eventType: t.eventType, condition: t.condition })),
      actions: rule.actions.map((a) => ({ actionType: a.actionType, payload: a.payload, order: a.order })),
    };

    const { triggers, actions, ...basicData } = dto;

    const updated = await this.prisma.$transaction(async (tx) => {
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

    void this.auditService.log({
      productionId,
      action: 'RULE_UPDATED',
      details: {
        ruleId: id,
        before,
        after: {
          ...basicData,
          triggers: triggers?.map((t) => ({ eventType: t.eventType, condition: t.condition })),
          actions: actions?.map((a, i) => ({ actionType: a.actionType, order: a.order ?? i })),
        },
      },
    });

    return updated;
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
      return this.conditionEvaluator.evaluateConditionNode(node, testPayload);
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
   * Imports rules atomically — all-or-nothing. If any rule fails, none are created.
   */
  async importRules(productionId: string, dto: ImportRulesDto) {
    const created = await this.prisma.$transaction(
      dto.rules.map((rule) =>
        this.prisma.rule.create({
          data: this.buildRuleData(productionId, rule),
          include: { triggers: true, actions: { orderBy: { order: 'asc' } } },
        }),
      ),
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
    // Awaits real execution — returns actual result instead of fire-and-forget
    return this.engineService.executeRuleById(ruleId, productionId);
  }

  async generateRuleAi(productionId: string, prompt: string) {
    const macro = await this.aiService.generateAutomationMacro(prompt);

    // Validate AI output against allowed types before touching the DB
    const invalidTriggers = macro.triggers.filter(
      (t) => !TRIGGER_EVENT_TYPES.includes(t.eventType as (typeof TRIGGER_EVENT_TYPES)[number]),
    );
    const invalidActions = macro.actions.filter(
      (a) => !ACTION_TYPES.includes(a.actionType as (typeof ACTION_TYPES)[number]),
    );

    if (invalidTriggers.length > 0 || invalidActions.length > 0) {
      throw new BadRequestException(
        `La IA generó tipos no permitidos. ` +
          (invalidTriggers.length ? `Triggers inválidos: ${invalidTriggers.map((t) => t.eventType).join(', ')}. ` : '') +
          (invalidActions.length ? `Actions inválidas: ${invalidActions.map((a) => a.actionType).join(', ')}.` : ''),
      );
    }

    return this.createRule(productionId, macro as unknown as CreateRuleDto);
  }
}
