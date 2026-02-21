import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { ObsService } from '../obs/obs.service';
import { VmixService } from '../vmix/vmix.service';
// Need IntercomService later if integrating Intercom actions

@Injectable()
export class AutomationEngineService {
    private readonly logger = new Logger(AutomationEngineService.name);

    constructor(
        private prisma: PrismaService,
        private obsService: ObsService,
        private vmixService: VmixService
    ) { }

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

    /**
     * Executes sequentially all actions defined in the rule.
     */
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

                    case 'vmix.changeInput':
                        if (payload?.input) {
                            await this.vmixService.changeInput(rule.productionId, { input: payload.input });
                        }
                        break;

                    // case 'intercom.send':
                    //   // Implement intercom send logic here
                    //   break;

                    case 'webhook.call':
                        // Implement webhook HTTP call logic here
                        this.logger.log(`Webhook Call (Mock): ${payload?.url}`);
                        break;

                    default:
                        this.logger.warn(`Unknown action type: ${action.actionType}`);
                }
            }

            // Log Success
            await this.logExecution(rule.id, rule.productionId, 'SUCCESS', 'All actions executed successfully.');
        } catch (error: any) {
            this.logger.error(`Rule execution failed for rule ${rule.id}: ${error.message}`);
            // Log Failure
            await this.logExecution(rule.id, rule.productionId, 'ERROR', error.message);
        }
    }

    private async logExecution(ruleId: string, productionId: string, status: string, details: string) {
        await this.prisma.ruleExecutionLog.create({
            data: {
                ruleId,
                productionId,
                status,
                details
            }
        });
    }
}
