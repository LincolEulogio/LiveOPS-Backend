import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { ObsService } from '@/obs/obs.service';
import { VmixService } from '@/vmix/vmix.service';
import { IntercomService } from '@/intercom/intercom.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { Rule, Trigger, Action } from '@prisma/client';
import { AuditService, AuditAction } from '@/common/services/audit.service';
import {
  TriggerConditionNode,
  SimpleCondition,
  CompoundCondition,
} from '@/automation/dto/automation.dto';

type ConditionValue = string | number | boolean | null;

interface EventPayload {
  productionId: string;
  [key: string]: ConditionValue | Date | object | undefined;
}

interface RuleWithActions extends Rule {
  triggers: Trigger[];
  actions: Action[];
}

type ActionPayload = Record<string, ConditionValue | undefined>;

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private prisma: PrismaService,
    private obsService: ObsService,
    private vmixService: VmixService,
    private intercomService: IntercomService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  /**
   * Ticker that runs every second to check for time-based triggers.
   * Rule executions are fire-and-forget to avoid blocking the interval.
   */
  @Interval(1000)
  async checkTimeTriggers() {
    const now = new Date();

    const activeBlocks = await this.prisma.timelineBlock.findMany({
      where: {
        status: 'ACTIVE',
        durationMs: { gt: 0 },
        startTime: { not: null },
      },
    });

    if (activeBlocks.length === 0) return;

    const activeProductionIds = [
      ...new Set(activeBlocks.map((b) => b.productionId)),
    ];

    const allRules = await this.prisma.rule.findMany({
      where: {
        productionId: { in: activeProductionIds },
        isEnabled: true,
        triggers: {
          some: { eventType: 'timeline.before_end' },
        },
      },
      include: {
        triggers: true,
        actions: { orderBy: { order: 'asc' } },
      },
    });

    for (const block of activeBlocks) {
      if (!block.startTime) continue;

      const elapsedTime = now.getTime() - block.startTime.getTime();
      const remainingSeconds = Math.floor(
        (block.durationMs - elapsedTime) / 1000,
      );

      const productionRules = allRules.filter(
        (r) => r.productionId === block.productionId,
      );

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
              // Fire-and-forget to avoid blocking the 1-second interval
              void this.executeActions(rule as RuleWithActions, {
                ...block,
                remainingSeconds,
              });
            }
          }
        }
      }
    }
  }

  /**
   * Listen to all events emitted on the internal EventBus.
   */
  @OnEvent('**')
  async handleEvent(eventPrefix: string, payload: EventPayload) {
    const productionId = payload?.productionId;
    if (!productionId) return;

    if (payload?.ruleId) {
      const rule = await this.prisma.rule.findUnique({
        where: { id: payload.ruleId as string },
        include: {
          triggers: true,
          actions: { orderBy: { order: 'asc' } },
        },
      });

      if (rule && rule.productionId === productionId) {
        this.logger.log(`Manual execution of rule "${rule.name}" (${rule.id})`);
        void this.executeActions(rule as RuleWithActions, {
          ...payload,
          isManual: true,
        });
        return;
      }
    }

    const rules = await this.prisma.rule.findMany({
      where: {
        productionId,
        isEnabled: true,
        triggers: {
          some: { eventType: eventPrefix },
        },
      },
      include: {
        triggers: true,
        actions: { orderBy: { order: 'asc' } },
      },
    });

    for (const rule of rules) {
      const match = this.evaluateTriggers(rule.triggers, eventPrefix, payload);
      if (match) {
        this.logger.log(
          `Executing Rule "${rule.name}" (${rule.id}) due to event ${eventPrefix}`,
        );
        const context =
          eventPrefix === 'manual.trigger'
            ? { ...payload, isManual: true }
            : payload;
        // Fire-and-forget to avoid blocking the event handler
        void this.executeActions(rule, context);
      }
    }

    // Direct instant-clip action without a full rule
    if (
      eventPrefix === 'manual.trigger' &&
      payload.actionType === 'engine.instantClip'
    ) {
      this.logger.log(
        `Executing direct action engine.instantClip for production ${productionId}`,
      );
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

  /**
   * Dedicated listener for hardware inputs (Stream Deck, MIDI, etc.)
   */
  @OnEvent('hardware.trigger')
  async handleHardwareTrigger(payload: {
    productionId: string;
    mapKey: string;
  }) {
    this.logger.debug(
      `Hardware trigger received: ${payload.mapKey} for production ${payload.productionId}`,
    );

    const mapping = await this.prisma.hardwareMapping.findUnique({
      where: {
        productionId_mapKey: {
          productionId: payload.productionId,
          mapKey: payload.mapKey,
        },
      },
      include: {
        rule: {
          include: {
            triggers: true,
            actions: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (mapping && mapping.rule && mapping.rule.isEnabled) {
      const ruleWithActions = mapping.rule as RuleWithActions;
      this.logger.log(
        `Executing Rule "${ruleWithActions.name}" via hardware mapping: ${payload.mapKey}`,
      );
      void this.executeActions(ruleWithActions, {
        ...payload,
        isHardware: true,
      });
    }
  }

  /**
   * Evaluates trigger conditions supporting:
   * - Compound AND/OR with SimpleCondition nodes (field/op/value)
   * - Legacy flat-map conditions ({ key: value, ... })
   */
  evaluateTriggers(
    triggers: Trigger[],
    eventPrefix: string,
    payload: EventPayload,
  ): boolean {
    const matchingTriggers = triggers.filter(
      (t) => t.eventType === eventPrefix,
    );

    const flatPayload = this.flattenPayload(payload);

    for (const t of matchingTriggers) {
      if (!t.condition) return true;

      const node = t.condition as unknown as TriggerConditionNode;
      if (this.evaluateConditionNode(node, flatPayload)) return true;
    }
    return false;
  }

  private flattenPayload(
    payload: EventPayload,
  ): Record<string, ConditionValue> {
    const flat: Record<string, ConditionValue> = {};
    for (const [key, val] of Object.entries(payload)) {
      if (
        val === null ||
        typeof val === 'string' ||
        typeof val === 'number' ||
        typeof val === 'boolean'
      ) {
        flat[key] = val;
      }
    }
    return flat;
  }

  evaluateConditionNode(
    node: TriggerConditionNode,
    payload: Record<string, ConditionValue>,
  ): boolean {
    // CompoundCondition: has `operator` and `conditions` array
    if (
      'operator' in node &&
      ((node as CompoundCondition).operator === 'AND' || (node as CompoundCondition).operator === 'OR')
    ) {
      const compound = node as CompoundCondition;
      if (compound.operator === 'AND') {
        return compound.conditions.every((c) =>
          this.evaluateConditionNode(c as TriggerConditionNode, payload),
        );
      }
      return compound.conditions.some((c) =>
        this.evaluateConditionNode(c as TriggerConditionNode, payload),
      );
    }

    // SimpleCondition: has `field`, `op`, `value`
    if ('field' in node && 'op' in node) {
      const simple = node as SimpleCondition;
      const payloadVal = payload[simple.field];
      switch (simple.op) {
        case 'eq':
          return payloadVal === simple.value;
        case 'neq':
          return payloadVal !== simple.value;
        case 'gt':
          return (
            typeof payloadVal === 'number' &&
            typeof simple.value === 'number' &&
            payloadVal > simple.value
          );
        case 'gte':
          return (
            typeof payloadVal === 'number' &&
            typeof simple.value === 'number' &&
            payloadVal >= simple.value
          );
        case 'lt':
          return (
            typeof payloadVal === 'number' &&
            typeof simple.value === 'number' &&
            payloadVal < simple.value
          );
        case 'lte':
          return (
            typeof payloadVal === 'number' &&
            typeof simple.value === 'number' &&
            payloadVal <= simple.value
          );
        case 'contains':
          return (
            typeof payloadVal === 'string' &&
            typeof simple.value === 'string' &&
            payloadVal.includes(simple.value)
          );
        default:
          return false;
      }
    }

    // LegacyCondition: flat key-value map — all entries must match
    const legacy = node as Record<string, ConditionValue>;
    return Object.entries(legacy).every(([key, val]) => payload[key] === val);
  }

  private async executeActions(
    rule: RuleWithActions,
    eventPayload: EventPayload,
  ) {
    try {
      this.logger.log(
        `Starting execution of ${rule.actions.length} actions for rule "${rule.name}"`,
      );

      const hasDelays = rule.actions.some((a) => {
        const p = a.payload as unknown as ActionPayload;
        return typeof p?.delayMs === 'number' && p.delayMs > 0;
      });

      if (hasDelays) {
        // Sequential execution respecting per-action delays
        for (const action of rule.actions) {
          const p = action.payload as unknown as ActionPayload;
          const delay = typeof p?.delayMs === 'number' ? p.delayMs : 0;
          if (delay > 0) {
            await new Promise<void>((resolve) => setTimeout(resolve, delay));
          }
          await this.executeAction(action, rule);
        }
      } else {
        // Parallel execution (original behaviour, faster)
        await Promise.all(
          rule.actions.map((action) => this.executeAction(action, rule)),
        );
      }

      const context =
        typeof eventPayload?.id === 'string' ||
        typeof eventPayload?.id === 'number'
          ? `Block: ${eventPayload.id}`
          : 'Generic event';

      await this.logExecution(
        rule.id,
        rule.productionId,
        'SUCCESS',
        `Executed for ${context}`,
      );

      await this.auditService.log({
        productionId: rule.productionId,
        action: AuditAction.AUTOMATION_TRIGGER,
        details: { ruleName: rule.name, ruleId: rule.id, context },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Rule execution failed for rule ${rule.id}: ${message}`,
      );
      await this.logExecution(rule.id, rule.productionId, 'ERROR', message);
    }
  }

  private async executeAction(action: Action, rule: RuleWithActions) {
    this.logger.debug(
      `Executing action ${action.actionType} (order: ${action.order})`,
    );
    const payload = action.payload as unknown as ActionPayload;

    try {
      switch (action.actionType) {
        case 'obs.changeScene':
          if (payload?.sceneName) {
            await this.obsService.changeScene(
              rule.productionId,
              payload.sceneName as string,
            );
          }
          break;

        case 'vmix.cut':
          await this.vmixService.cut(rule.productionId);
          break;

        case 'vmix.fade':
          await this.vmixService.fade(
            rule.productionId,
            (payload?.duration as number) || 500,
          );
          break;

        case 'vmix.changeInput':
          if (payload?.input) {
            await this.vmixService.changeInput(
              rule.productionId,
              payload.input as number,
            );
          }
          break;

        case 'intercom.send':
          if (payload?.templateId || payload?.message) {
            let message = payload.message as string | undefined;
            if (!message && payload.templateId) {
              const template =
                await this.prisma.commandTemplate.findUnique({
                  where: { id: payload.templateId as string },
                });
              message = template?.name || 'Automation Alert';
            }

            await this.intercomService.sendCommand({
              productionId: rule.productionId,
              senderId: '00000000-0000-0000-0000-000000000000',
              targetRoleId: payload?.targetRoleId as string,
              templateId: payload?.templateId as string,
              message: message ?? '',
              requiresAck: (payload?.requiresAck as boolean) ?? true,
            });
          }
          break;

        case 'webhook.call':
          if (payload?.url || payload?.message) {
            await this.notificationsService.sendNotification(
              rule.productionId,
              (payload.message as string) ||
                `Automation Rule Triggered: ${rule.name}`,
            );
          }
          break;

        case 'engine.instantClip':
          try {
            if (this.obsService.isConnected(rule.productionId)) {
              await this.obsService.saveReplayBuffer(rule.productionId);
            } else if (this.vmixService.isConnected(rule.productionId)) {
              await this.vmixService.saveVideoDelay(rule.productionId);
            }
          } catch (e: unknown) {
            this.logger.error(
              `Failed to trigger instant clip: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
          break;

        default:
          this.logger.warn(`Unknown action type: ${action.actionType}`);
      }
    } catch (actionError: unknown) {
      this.logger.error(
        `Action ${action.actionType} failed: ${actionError instanceof Error ? actionError.message : String(actionError)}`,
      );
      throw actionError;
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
