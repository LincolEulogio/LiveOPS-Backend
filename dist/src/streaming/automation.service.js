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
var AutomationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const streaming_service_1 = require("./streaming.service");
let AutomationService = AutomationService_1 = class AutomationService {
    streamingService;
    logger = new common_1.Logger(AutomationService_1.name);
    constructor(streamingService) {
        this.streamingService = streamingService;
    }
    async handleBlockStarted(payload) {
        if (!payload.linkedScene)
            return;
        this.logger.log(`Automation: Block ${payload.blockId} started. Triggering scene: ${payload.linkedScene}`);
        try {
            await this.streamingService.handleCommand(payload.productionId, {
                type: 'CHANGE_SCENE',
                sceneName: payload.linkedScene,
            });
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            this.logger.error(`Automation failed for block ${payload.blockId}: ${message}`);
        }
    }
};
exports.AutomationService = AutomationService;
__decorate([
    (0, event_emitter_1.OnEvent)('timeline.block.started'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AutomationService.prototype, "handleBlockStarted", null);
exports.AutomationService = AutomationService = AutomationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [streaming_service_1.StreamingService])
], AutomationService);
//# sourceMappingURL=automation.service.js.map