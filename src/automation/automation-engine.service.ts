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

interface TriggerCondition {
  secondsBefore?: number;
  [key: string]: string | number | boolean | undefined | null;
}

interface EventPayload {
  productionId: string;
  [key: string]: string | number | boolean | undefined | null | Date | object;
}

interface RuleWithActions extends Rule {
  triggers: Trigger[];
  actions: Action[];
}

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
  ) { }

  /**
   * Ticker that runs every second to check for time-based triggers.
   */
  @Interval(1000)
  async checkTimeTriggers() {
    const now = new Date();

    // Find active blocks with duration
    const activeBlocks = await this.prisma.timelineBlock.findMany({
      where: {
        status: 'ACTIVE',
        durationMs: { gt: 0 },
        startTime: { not: null },
      },
    });

    for (const block of activeBlocks) {
      if (!block.startTime) continue;

      const elapsedTime = now.getTime() - block.startTime.getTime();
      const remainingTime = block.durationMs - elapsedTime;
      const remainingSeconds = Math.floor(remainingTime / 1000);

      // Fetch rules for this production that have 'timeline.before_end' triggers
      const rules = await this.prisma.rule.findMany({
        where: {
          productionId: block.productionId,
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

      for (const rule of rules) {
        for (const trigger of rule.triggers) {
          if (trigger.eventType !== 'timeline.before_end') continue;

          const condition = trigger.condition as unknown as TriggerCondition;
          const triggerSeconds = condition?.secondsBefore || 0;

          // Trigger if we just hit the mark (with a 1s tolerance)
          if (remainingSeconds === triggerSeconds) {
            // Check if already executed for this block to avoid repeats
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
              await this.executeActions(rule, { ...block, remainingSeconds });
            }
          }
        }
      }
    }
  }

  /**
   * Listen to all events emitted on the internal EventBus.
   * Wildcard '**' requires EventEmitter2 wildcard feature to be enabled.
   */
  @OnEvent('**')
  async handleEvent(eventPrefix: string, payload: EventPayload) {
    // Most domain events will have productionId in the payload
    const productionId = payload?.productionId;
    if (!productionId) return;

    // Fetch enabled rules with triggers matching this eventType
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
        // Add manual trigger context if applicable
        const context = eventPrefix === 'manual.trigger' ? { ...payload, isManual: true } : payload;
        await this.executeActions(rule, context);
      }
    }

    // Special case: Single action trigger without full rule (for Instant Clip)
    if (eventPrefix === 'manual.trigger' && payload.actionType === 'engine.instantClip') {
      this.logger.log(`Executing direct action engine.instantClip for production ${productionId}`);
      // Create a dummy rule for action execution
      const dummyRule: any = {
        id: 'manual-trigger',
        productionId,
        name: 'Manual Instant Clip',
        actions: [{
          actionType: 'engine.instantClip',
          payload: {},
          order: 0
        }]
      };
      await this.executeActions(dummyRule, { ...payload, isManual: true });
    }
  }

  /**
   * Dedicated listener for hardware inputs (Stream Deck, MIDI, etc.)
   */
  @OnEvent('hardware.trigger')
  async handleHardwareTrigger(payload: { productionId: string; mapKey: string }) {
    this.logger.debug(`Hardware trigger received: ${payload.mapKey} for production ${payload.productionId}`);

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
      this.logger.log(`Executing Rule "${ruleWithActions.name}" via hardware mapping: ${payload.mapKey}`);
      await this.executeActions(ruleWithActions, { ...payload, isHardware: true });
    }
  }

  /**
   * Evaluates if any trigger condition matches the payload.
   * Basic implementation: JSON subset matching.
   */
  private evaluateTriggers(
    triggers: Trigger[],
    eventPrefix: string,
    payload: EventPayload,
  ): boolean {
    const matchingTriggers = triggers.filter(
      (t) => t.eventType === eventPrefix,
    );

    for (const t of matchingTriggers) {
      if (!t.condition) return true; // No conditions = run on any event of this type

      // Check if payload matches condition properties
      const conditionObj = t.condition as unknown as Record<string, string | number | boolean | null>;
      let matches = true;
      for (const [key, val] of Object.entries(conditionObj)) {
        if (payload[key] !== val) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }
    return false;
  }

  private async executeActions(rule: RuleWithActions, eventPayload: EventPayload) {
    try {
      this.logger.log(`Starting execution of ${rule.actions.length} actions for rule "${rule.name}"`);

      const executionPromises = rule.actions.map(async (action) => {
        this.logger.debug(
          `Queueing action ${action.actionType} (order: ${action.order})`,
        );
        const payload = action.payload as unknown as Record<string, string | number | boolean | null>;

        try {
          switch (action.actionType) {
            case 'obs.changeScene':
              if (payload?.sceneName) {
                await this.obsService.changeScene(rule.productionId, {
                  sceneName: payload.sceneName as string,
                });
              }
              break;

            case 'vmix.cut':
              await this.vmixService.cut(rule.productionId);
              break;

            case 'vmix.fade':
              await this.vmixService.fade(rule.productionId, {
                duration: (payload?.duration as number) || 500,
              });
              break;

            case 'vmix.changeInput':
              if (payload?.input) {
                await this.vmixService.changeInput(rule.productionId, {
                  input: payload.input as number,
                });
              }
              break;

            case 'intercom.send':
              if (payload?.templateId || payload?.message) {
                let message = payload.message as string;
                if (!message && payload.templateId) {
                  const template = await this.prisma.commandTemplate.findUnique({
                    where: { id: payload.templateId as string },
                  });
                  message = template?.name || 'Automation Alert';
                }

                await this.intercomService.sendCommand({
                  productionId: rule.productionId,
                  senderId: '00000000-0000-0000-0000-000000000000', // SYSTEM ID
                  targetRoleId: payload?.targetRoleId as string,
                  templateId: payload?.templateId as string,
                  message: message,
                  requiresAck: (payload?.requiresAck as boolean) ?? true,
                });
              }
              break;

            case 'webhook.call':
              if (payload?.url || payload?.message) {
                await this.notificationsService.sendNotification(
                  rule.productionId,
                  (payload.message as string) || `Automation Rule Triggered: ${rule.name}`,
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
              } catch (e: any) {
                this.logger.error(`Failed to trigger instant clip: ${e.message}`);
              }
              break;

            default:
              this.logger.warn(`Unknown action type: ${action.actionType}`);
          }
        } catch (actionError: any) {
          this.logger.error(`Action ${action.actionType} failed: ${actionError.message}`);
          throw actionError; // Re-throw to be caught by Promise.all
        }
      });

      // Execute all actions in parallel
      await Promise.all(executionPromises);

      // Log Success with context
      const context = eventPayload?.id
        ? `Block: ${eventPayload.id}`
        : 'Generic event';
      await this.logExecution(
        rule.id,
        rule.productionId,
        'SUCCESS',
        `Executed for ${context as string}`,
      );

      // Audit Log
      this.auditService.log({
        productionId: rule.productionId,
        action: AuditAction.AUTOMATION_TRIGGER,
        details: { ruleName: rule.name, ruleId: rule.id, context },
      });
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Rule execution failed for rule ${rule.id}: ${err.message}`,
      );
      await this.logExecution(
        rule.id,
        rule.productionId,
        'ERROR',
        err.message,
      );
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
