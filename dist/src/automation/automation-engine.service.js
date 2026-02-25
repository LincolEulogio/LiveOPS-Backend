"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AutomationEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationEngineService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const obs_service_1 = require("../obs/obs.service");
const vmix_service_1 = require("../vmix/vmix.service");
const intercom_service_1 = require("../intercom/intercom.service");
const notifications_service_1 = require("../notifications/notifications.service");
const audit_service_1 = require("../common/services/audit.service");
let AutomationEngineService = AutomationEngineService_1 = class AutomationEngineService {
    prisma;
    obsService;
    vmixService;
    intercomService;
    notificationsService;
    auditService;
    logger = new common_1.Logger(AutomationEngineService_1.name);
    constructor(prisma, obsService, vmixService, intercomService, notificationsService, auditService) {
        this.prisma = prisma;
        this.obsService = obsService;
        this.vmixService = vmixService;
        this.intercomService = intercomService;
        this.notificationsService = notificationsService;
        this.auditService = auditService;
    }
    async checkTimeTriggers() {
        const now = new Date();
        const activeBlocks = await this.prisma.timelineBlock.findMany({
            where: {
                status: 'ACTIVE',
                durationMs: { gt: 0 },
                startTime: { not: null },
            },
        });
        for (const block of activeBlocks) {
            if (!block.startTime)
                continue;
            const elapsedTime = now.getTime() - block.startTime.getTime();
            const remainingTime = block.durationMs - elapsedTime;
            const remainingSeconds = Math.floor(remainingTime / 1000);
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
                    if (trigger.eventType !== 'timeline.before_end')
                        continue;
                    const condition = trigger.condition;
                    const triggerSeconds = condition?.secondsBefore || 0;
                    if (remainingSeconds === triggerSeconds) {
                        const alreadyLogged = await this.prisma.ruleExecutionLog.findFirst({
                            where: {
                                ruleId: rule.id,
                                details: { contains: `Block: ${block.id}` },
                                createdAt: { gt: block.startTime },
                            },
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
    async handleEvent(eventPrefix, payload) {
        const productionId = payload?.productionId;
        if (!productionId)
            return;
        if (payload?.ruleId) {
            const rule = await this.prisma.rule.findUnique({
                where: { id: payload.ruleId },
                include: {
                    triggers: true,
                    actions: { orderBy: { order: 'asc' } },
                },
            });
            if (rule && rule.productionId === productionId) {
                this.logger.log(`Manual execution of rule "${rule.name}" (${rule.id})`);
                await this.executeActions(rule, { ...payload, isManual: true });
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
                this.logger.log(`Executing Rule "${rule.name}" (${rule.id}) due to event ${eventPrefix}`);
                const context = eventPrefix === 'manual.trigger' ? { ...payload, isManual: true } : payload;
                await this.executeActions(rule, context);
            }
        }
        if (eventPrefix === 'manual.trigger' && payload.actionType === 'engine.instantClip') {
            this.logger.log(`Executing direct action engine.instantClip for production ${productionId}`);
            const dummyRule = {
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
    async handleHardwareTrigger(payload) {
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
            const ruleWithActions = mapping.rule;
            this.logger.log(`Executing Rule "${ruleWithActions.name}" via hardware mapping: ${payload.mapKey}`);
            await this.executeActions(ruleWithActions, { ...payload, isHardware: true });
        }
    }
    evaluateTriggers(triggers, eventPrefix, payload) {
        const matchingTriggers = triggers.filter((t) => t.eventType === eventPrefix);
        for (const t of matchingTriggers) {
            if (!t.condition)
                return true;
            const conditionObj = t.condition;
            let matches = true;
            for (const [key, val] of Object.entries(conditionObj)) {
                if (payload[key] !== val) {
                    matches = false;
                    break;
                }
            }
            if (matches)
                return true;
        }
        return false;
    }
    async executeActions(rule, eventPayload) {
        try {
            this.logger.log(`Starting execution of ${rule.actions.length} actions for rule "${rule.name}"`);
            const executionPromises = rule.actions.map(async (action) => {
                this.logger.debug(`Queueing action ${action.actionType} (order: ${action.order})`);
                const payload = action.payload;
                try {
                    switch (action.actionType) {
                        case 'obs.changeScene':
                            if (payload?.sceneName) {
                                await this.obsService.changeScene(rule.productionId, {
                                    sceneName: payload.sceneName,
                                });
                            }
                            break;
                        case 'vmix.cut':
                            await this.vmixService.cut(rule.productionId);
                            break;
                        case 'vmix.fade':
                            await this.vmixService.fade(rule.productionId, {
                                duration: payload?.duration || 500,
                            });
                            break;
                        case 'vmix.changeInput':
                            if (payload?.input) {
                                await this.vmixService.changeInput(rule.productionId, {
                                    input: payload.input,
                                });
                            }
                            break;
                        case 'intercom.send':
                            if (payload?.templateId || payload?.message) {
                                let message = payload.message;
                                if (!message && payload.templateId) {
                                    const template = await this.prisma.commandTemplate.findUnique({
                                        where: { id: payload.templateId },
                                    });
                                    message = template?.name || 'Automation Alert';
                                }
                                await this.intercomService.sendCommand({
                                    productionId: rule.productionId,
                                    senderId: '00000000-0000-0000-0000-000000000000',
                                    targetRoleId: payload?.targetRoleId,
                                    templateId: payload?.templateId,
                                    message: message,
                                    requiresAck: payload?.requiresAck ?? true,
                                });
                            }
                            break;
                        case 'webhook.call':
                            if (payload?.url || payload?.message) {
                                await this.notificationsService.sendNotification(rule.productionId, payload.message || `Automation Rule Triggered: ${rule.name}`);
                            }
                            break;
                        case 'engine.instantClip':
                            try {
                                if (this.obsService.isConnected(rule.productionId)) {
                                    await this.obsService.saveReplayBuffer(rule.productionId);
                                }
                                else if (this.vmixService.isConnected(rule.productionId)) {
                                    await this.vmixService.saveVideoDelay(rule.productionId);
                                }
                            }
                            catch (e) {
                                this.logger.error(`Failed to trigger instant clip: ${e.message}`);
                            }
                            break;
                        default:
                            this.logger.warn(`Unknown action type: ${action.actionType}`);
                    }
                }
                catch (actionError) {
                    this.logger.error(`Action ${action.actionType} failed: ${actionError.message}`);
                    throw actionError;
                }
            });
            await Promise.all(executionPromises);
            const context = eventPayload?.id
                ? `Block: ${eventPayload.id}`
                : 'Generic event';
            await this.logExecution(rule.id, rule.productionId, 'SUCCESS', `Executed for ${context}`);
            this.auditService.log({
                productionId: rule.productionId,
                action: audit_service_1.AuditAction.AUTOMATION_TRIGGER,
                details: { ruleName: rule.name, ruleId: rule.id, context },
            });
        }
        catch (error) {
            const err = error;
            this.logger.error(`Rule execution failed for rule ${rule.id}: ${err.message}`);
            await this.logExecution(rule.id, rule.productionId, 'ERROR', err.message);
        }
    }
    async logExecution(ruleId, productionId, status, details) {
        await this.prisma.ruleExecutionLog.create({
            data: {
                ruleId,
                productionId,
                status,
                details: details.length > 500 ? details.substring(0, 500) : details,
            },
        });
    }
};
exports.AutomationEngineService = AutomationEngineService;
__decorate([
    (0, schedule_1.Interval)(1000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationEngineService.prototype, "checkTimeTriggers", null);
__decorate([
    (0, event_emitter_1.OnEvent)('**'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AutomationEngineService.prototype, "handleEvent", null);
__decorate([
    (0, event_emitter_1.OnEvent)('hardware.trigger'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AutomationEngineService.prototype, "handleHardwareTrigger", null);
exports.AutomationEngineService = AutomationEngineService = AutomationEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        obs_service_1.ObsService,
        vmix_service_1.VmixService,
        intercom_service_1.IntercomService,
        notifications_service_1.NotificationsService,
        audit_service_1.AuditService])
], AutomationEngineService);
//# sourceMappingURL=automation-engine.service.js.map