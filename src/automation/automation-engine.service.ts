import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService, AuditAction } from '@/common/services/audit.service';
import { AutomationConditionEvaluator } from './automation-condition.evaluator';
import { AutomationActionExecutor } from './automation-action.executor';
import { ConditionValue, EventPayload, RuleWithActions } from './automation-engine.types';

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  /** Guards against concurrent execution of the same rule (event storms, race conditions). */
  private readonly executingRules = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private conditionEvaluator: AutomationConditionEvaluator,
    private actionExecutor: AutomationActionExecutor,
  ) {}

  // ─── Time-based triggers ──────────────────────────────────────────────────

  /** Runs every second — checks timeline blocks for `timeline.before_end` triggers. */
  @Interval(1000)
  async checkTimeTriggers() {
    const now = new Date();

    const activeBlocks = await this.prisma.timelineBlock.findMany({
      where: { status: 'ACTIVE', durationMs: { gt: 0 }, startTime: { not: null } },
    });

    if (activeBlocks.length === 0) return;

    const activeProductionIds = [...new Set(activeBlocks.map((b) => b.productionId))];

    const allRules = await this.prisma.rule.findMany({
      where: {
        productionId: { in: activeProductionIds },
        isEnabled: true,
        triggers: { some: { eventType: 'timeline.before_end' } },
      },
      include: { triggers: true, actions: { orderBy: { order: 'asc' } } },
    });

    for (const block of activeBlocks) {
      if (!block.startTime) continue;

      const elapsedTime = now.getTime() - block.startTime.getTime();
      const remainingSeconds = Math.floor((block.durationMs - elapsedTime) / 1000);
      const productionRules = allRules.filter((r) => r.productionId === block.productionId);

      for (const rule of productionRules) {
        for (const trigger of rule.triggers) {
          if (trigger.eventType !== 'timeline.before_end') continue;

          const condition = trigger.condition as unknown as Record<string, ConditionValue>;
          const triggerSeconds = (condition?.secondsBefore as number) || 0;

          if (remainingSeconds === triggerSeconds) {
            const alreadyLogged = await this.prisma.ruleExecutionLog.findFirst({
              where: {
                ruleId: rule.id,
                details: { contains: `Block: ${block.id}` },
                createdAt: { gt: block.startTime },
              },
            });

            if (!alreadyLogged) {
              this.logger.log(
                `Time-trigger hit! Rule "${rule.name}" triggered ${triggerSeconds}s before block end.`,
              );
              void this.executeActions(rule as RuleWithActions, { ...block, remainingSeconds });
            }
          }
        }
      }
    }
  }

  // ─── Event-based triggers ─────────────────────────────────────────────────

  /** Catches all internal events — evaluates rules whose triggers match the event. */
  @OnEvent('**')
  async handleEvent(eventPrefix: string, payload: EventPayload) {
    const productionId = payload?.productionId;
    if (!productionId) return;

    // Manual execution of a specific rule by ID
    if (payload?.ruleId) {
      const rule = await this.prisma.rule.findUnique({
        where: { id: payload.ruleId as string },
        include: { triggers: true, actions: { orderBy: { order: 'asc' } } },
      });

      if (rule && rule.productionId === productionId) {
        this.logger.log(`Manual execution of rule "${rule.name}" (${rule.id})`);
        void this.executeActions(rule as RuleWithActions, { ...payload, isManual: true });
        return;
      }
    }

    const rules = await this.prisma.rule.findMany({
      where: {
        productionId,
        isEnabled: true,
        triggers: { some: { eventType: eventPrefix } },
      },
      include: { triggers: true, actions: { orderBy: { order: 'asc' } } },
    });

    for (const rule of rules) {
      const match = this.conditionEvaluator.evaluateTriggers(rule.triggers, eventPrefix, payload);
      if (match) {
        this.logger.log(`Executing Rule "${rule.name}" (${rule.id}) due to event ${eventPrefix}`);
        const context = eventPrefix === 'manual.trigger' ? { ...payload, isManual: true } : payload;
        void this.executeActions(rule, context);
      }
    }

    // Direct instant-clip action without a full rule
    if (eventPrefix === 'manual.trigger' && payload.actionType === 'engine.instantClip') {
      this.logger.log(`Executing direct action engine.instantClip for production ${productionId}`);
      const dummyRule: RuleWithActions = {
        id: 'manual-trigger',
        productionId,
        name: 'Manual Instant Clip',
        description: null,
        isEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        triggers: [],
        actions: [
          {
            id: 'dummy-action',
            ruleId: 'manual-trigger',
            actionType: 'engine.instantClip',
            payload: {},
            order: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      void this.executeActions(dummyRule, { ...payload, isManual: true });
    }
  }

  /** Dedicated listener for hardware inputs (Stream Deck, MIDI, etc.) */
  @OnEvent('hardware.trigger')
  async handleHardwareTrigger(payload: { productionId: string; mapKey: string }) {
    this.logger.debug(
      `Hardware trigger received: ${payload.mapKey} for production ${payload.productionId}`,
    );

    const mapping = await this.prisma.hardwareMapping.findUnique({
      where: {
        productionId_mapKey: { productionId: payload.productionId, mapKey: payload.mapKey },
      },
      include: {
        rule: { include: { triggers: true, actions: { orderBy: { order: 'asc' } } } },
      },
    });

    if (mapping?.rule?.isEnabled) {
      const rule = mapping.rule as RuleWithActions;
      this.logger.log(`Executing Rule "${rule.name}" via hardware mapping: ${payload.mapKey}`);
      void this.executeActions(rule, { ...payload, isHardware: true });
    }
  }

  // ─── Public execution API ─────────────────────────────────────────────────

  /** Executes a rule by ID and awaits completion — use this instead of fire-and-forget events. */
  async executeRuleById(
    ruleId: string,
    productionId: string,
  ): Promise<{ success: boolean; ruleName: string; status: string }> {
    const rule = await this.prisma.rule.findFirst({
      where: { id: ruleId, productionId },
      include: { triggers: true, actions: { orderBy: { order: 'asc' } } },
    });
    if (!rule) throw new NotFoundException('Rule not found');

    await this.executeActions(rule as RuleWithActions, { productionId, isManual: true });
    return { success: true, ruleName: rule.name, status: 'executed' };
  }

  // ─── Action orchestration ─────────────────────────────────────────────────

  private async executeActions(rule: RuleWithActions, eventPayload: EventPayload) {
    if (this.executingRules.has(rule.id)) {
      this.logger.warn(
        `Rule "${rule.name}" (${rule.id}) already executing — skipping concurrent trigger`,
      );
      return;
    }

    this.executingRules.add(rule.id);
    try {
      this.logger.log(
        `Starting execution of ${rule.actions.length} actions for rule "${rule.name}"`,
      );

      const hasDelays = rule.actions.some((a) => {
        const p = a.payload as unknown as Record<string, unknown>;
        return typeof p?.delayMs === 'number' && p.delayMs > 0;
      });

      if (hasDelays) {
        for (const action of rule.actions) {
          const p = action.payload as unknown as Record<string, unknown>;
          const delay = typeof p?.delayMs === 'number' ? p.delayMs : 0;
          if (delay > 0) await new Promise<void>((resolve) => setTimeout(resolve, delay));
          await this.actionExecutor.executeAction(action, rule);
        }
      } else {
        await Promise.all(rule.actions.map((action) => this.actionExecutor.executeAction(action, rule)));
      }

      const context =
        typeof eventPayload?.id === 'string' || typeof eventPayload?.id === 'number'
          ? `Block: ${eventPayload.id}`
          : 'Generic event';

      await this.logExecution(rule.id, rule.productionId, 'SUCCESS', `Executed for ${context}`);

      await this.auditService.log({
        productionId: rule.productionId,
        action: AuditAction.AUTOMATION_TRIGGER,
        details: { ruleName: rule.name, ruleId: rule.id, context },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Rule execution failed for rule ${rule.id}: ${message}`);
      await this.logExecution(rule.id, rule.productionId, 'ERROR', message);
    } finally {
      this.executingRules.delete(rule.id);
    }
  }

  private async logExecution(
    ruleId: string,
    productionId: string,
    status: string,
    details: string,
  ) {
    await this.prisma.ruleExecutionLog.create({
      data: {
        ruleId,
        productionId,
        status,
        details: details.length > 500 ? details.substring(0, 500) : details,
      },
    });
  }
}
