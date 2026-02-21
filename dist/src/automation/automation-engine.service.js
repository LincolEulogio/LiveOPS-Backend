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
const prisma_service_1 = require("../prisma/prisma.service");
const obs_service_1 = require("../obs/obs.service");
const vmix_service_1 = require("../vmix/vmix.service");
let AutomationEngineService = AutomationEngineService_1 = class AutomationEngineService {
    prisma;
    obsService;
    vmixService;
    logger = new common_1.Logger(AutomationEngineService_1.name);
    constructor(prisma, obsService, vmixService) {
        this.prisma = prisma;
        this.obsService = obsService;
        this.vmixService = vmixService;
    }
    async handleEvent(eventPrefix, payload) {
        const productionId = payload?.productionId;
        if (!productionId)
            return;
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
    evaluateTriggers(triggers, eventPrefix, payload) {
        const matchingTriggers = triggers.filter(t => t.eventType === eventPrefix);
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
            for (const action of rule.actions) {
                this.logger.debug(`Executing action ${action.actionType} for rule ${rule.name}`);
                const payload = action.payload;
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
                    case 'webhook.call':
                        this.logger.log(`Webhook Call (Mock): ${payload?.url}`);
                        break;
                    default:
                        this.logger.warn(`Unknown action type: ${action.actionType}`);
                }
            }
            await this.logExecution(rule.id, rule.productionId, 'SUCCESS', 'All actions executed successfully.');
        }
        catch (error) {
            this.logger.error(`Rule execution failed for rule ${rule.id}: ${error.message}`);
            await this.logExecution(rule.id, rule.productionId, 'ERROR', error.message);
        }
    }
    async logExecution(ruleId, productionId, status, details) {
        await this.prisma.ruleExecutionLog.create({
            data: {
                ruleId,
                productionId,
                status,
                details
            }
        });
    }
};
exports.AutomationEngineService = AutomationEngineService;
__decorate([
    (0, event_emitter_1.OnEvent)('**'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AutomationEngineService.prototype, "handleEvent", null);
exports.AutomationEngineService = AutomationEngineService = AutomationEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        obs_service_1.ObsService,
        vmix_service_1.VmixService])
], AutomationEngineService);
//# sourceMappingURL=automation-engine.service.js.map