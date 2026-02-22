import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ObsService } from '../obs/obs.service';
import { VmixService } from '../vmix/vmix.service';
import { IntercomService } from '../intercom/intercom.service';

@Injectable()
export class AutomationEngineService {
    private readonly logger = new Logger(AutomationEngineService.name);

    constructor(
        private prisma: PrismaService,
        private obsService: ObsService,
        private vmixService: VmixService,
        private intercomService: IntercomService
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
                startTime: { not: null }
            }
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
                        some: { eventType: 'timeline.before_end' }
                    }
                },
                include: {
                    triggers: true,
                    actions: { orderBy: { order: 'asc' } }
                }
            });

            for (const rule of rules) {
                for (const trigger of rule.triggers) {
                    if (trigger.eventType !== 'timeline.before_end') continue;

                    const condition = trigger.condition as any;
                    const triggerSeconds = condition?.secondsBefore || 0;

                    // Trigger if we just hit the mark (with a 1s tolerance)
                    if (remainingSeconds === triggerSeconds) {
                        // Check if already executed for this block to avoid repeats
                        const alreadyLogged = await this.prisma.ruleExecutionLog.findFirst({
                            where: {
                                ruleId: rule.id,
                                details: { contains: `Block: ${block.id}` },
                                createdAt: { gt: block.startTime }
                            }
                        });

                        if (!alreadyLogged) {
                            this.logger.log(`Time-trigger hit! Rule "${rule.name}" triggered ${triggerSeconds}s before block end.`);
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
    async handleEvent(eventPrefix: string, payload: any) {
        // Most domain events will have productionId in the payload
        const productionId = payload?.productionId;
        if (!productionId) return;

        // Fetch enabled rules with triggers matching this eventType
        const rules = await this.prisma.rule.findMany({
            where: {
                productionId,
                isEnabled: true,
                triggers: {
                    some: { eventType: eventPrefix }
                }
            },
            include: {
                triggers: true,
                actions: { orderBy: { order: 'asc' } }
            }
        });

        for (const rule of rules) {
            const match = this.evaluateTriggers(rule.triggers, eventPrefix, payload);
            if (match) {
                this.logger.log(`Executing Rule "${rule.name}" (${rule.id}) due to event ${eventPrefix}`);
                await this.executeActions(rule, payload);
            }
        }
    }

    /**
     * Evaluates if any trigger condition matches the payload.
     * Basic implementation: JSON subset matching.
     */
    private evaluateTriggers(triggers: any[], eventPrefix: string, payload: any): boolean {
        const matchingTriggers = triggers.filter(t => t.eventType === eventPrefix);

        for (const t of matchingTriggers) {
            if (!t.condition) return true; // No conditions = run on any event of this type

            // Check if payload matches condition properties
            const conditionObj = t.condition as Record<string, any>;
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

    private async executeActions(rule: any, eventPayload: any) {
        try {
            for (const action of rule.actions) {
                this.logger.debug(`Executing action ${action.actionType} for rule ${rule.name}`);
                const payload = action.payload as any;

                switch (action.actionType) {
                    case 'obs.changeScene':
                        if (payload?.sceneName) {
                            await this.obsService.changeScene(rule.productionId, { sceneName: payload.sceneName });
                        }
                        break;

                    case 'vmix.cut':
                        await this.vmixService.cut(rule.productionId);
                        break;

                    case 'vmix.fade':
                        await this.vmixService.fade(rule.productionId, { duration: payload?.duration || 500 });
                        break;

                    case 'vmix.changeInput':
                        if (payload?.input) {
                            await this.vmixService.changeInput(rule.productionId, { input: payload.input });
                        }
                        break;

                    case 'intercom.send':
                        if (payload?.templateId || payload?.message) {
                            // If templateId is provided and message is empty, fetch template name
                            let message = payload.message;
                            if (!message && payload.templateId) {
                                const template = await this.prisma.commandTemplate.findUnique({ where: { id: payload.templateId } });
                                message = template?.name || 'Automation Alert';
                            }

                            await this.intercomService.sendCommand({
                                productionId: rule.productionId,
                                senderId: '00000000-0000-0000-0000-000000000000', // SYSTEM ID
                                targetRoleId: payload?.targetRoleId,
                                templateId: payload?.templateId,
                                message: message,
                                requiresAck: payload?.requiresAck ?? true
                            });
                        }
                        break;

                    case 'webhook.call':
                        // Implement webhook HTTP call logic here
                        this.logger.log(`Webhook Call (Mock): ${payload?.url}`);
                        break;

                    default:
                        this.logger.warn(`Unknown action type: ${action.actionType}`);
                }
            }

            // Log Success with context
            const context = eventPayload?.id ? `Block: ${eventPayload.id}` : 'Generic event';
            await this.logExecution(rule.id, rule.productionId, 'SUCCESS', `Executed for ${context}`);
        } catch (error: any) {
            this.logger.error(`Rule execution failed for rule ${rule.id}: ${error.message}`);
            await this.logExecution(rule.id, rule.productionId, 'ERROR', error.message);
        }
    }

    private async logExecution(ruleId: string, productionId: string, status: string, details: string) {
        await this.prisma.ruleExecutionLog.create({
            data: {
                ruleId,
                productionId,
                status,
                details: details.length > 500 ? details.substring(0, 500) : details
            }
        });
    }
}
