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
var TallyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TallyService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const events_gateway_1 = require("../websockets/events.gateway");
let TallyService = TallyService_1 = class TallyService {
    eventsGateway;
    logger = new common_1.Logger(TallyService_1.name);
    constructor(eventsGateway) {
        this.eventsGateway = eventsGateway;
    }
    handleObsTally(payload) {
        this.broadcastTally({
            productionId: payload.productionId,
            engineType: 'OBS',
            program: payload.sceneName,
        });
    }
    handleVmixTally(payload) {
        this.broadcastTally({
            productionId: payload.productionId,
            engineType: 'VMIX',
            program: payload.activeInput.toString(),
            preview: payload.previewInput.toString(),
        });
    }
    broadcastTally(update) {
        this.eventsGateway.server
            .to(`production:${update.productionId}`)
            .emit('streaming.tally', update);
    }
};
exports.TallyService = TallyService;
__decorate([
    (0, event_emitter_1.OnEvent)('obs.scene.changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TallyService.prototype, "handleObsTally", null);
__decorate([
    (0, event_emitter_1.OnEvent)('vmix.input.changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TallyService.prototype, "handleVmixTally", null);
exports.TallyService = TallyService = TallyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [events_gateway_1.EventsGateway])
], TallyService);
//# sourceMappingURL=tally.service.js.map