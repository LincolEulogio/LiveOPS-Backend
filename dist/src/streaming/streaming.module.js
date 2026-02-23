"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingModule = void 0;
const common_1 = require("@nestjs/common");
const streaming_controller_1 = require("./streaming.controller");
const streaming_service_1 = require("./streaming.service");
const obs_module_1 = require("../obs/obs.module");
const vmix_module_1 = require("../vmix/vmix.module");
const websockets_module_1 = require("../websockets/websockets.module");
const tally_service_1 = require("./tally.service");
const automation_service_1 = require("./automation.service");
const streaming_destinations_service_1 = require("./streaming-destinations.service");
let StreamingModule = class StreamingModule {
};
exports.StreamingModule = StreamingModule;
exports.StreamingModule = StreamingModule = __decorate([
    (0, common_1.Module)({
        imports: [obs_module_1.ObsModule, vmix_module_1.VmixModule, websockets_module_1.WebsocketsModule],
        controllers: [streaming_controller_1.StreamingController],
        providers: [streaming_service_1.StreamingService, tally_service_1.TallyService, automation_service_1.AutomationService, streaming_destinations_service_1.StreamingDestinationsService],
        exports: [streaming_service_1.StreamingService, tally_service_1.TallyService, automation_service_1.AutomationService, streaming_destinations_service_1.StreamingDestinationsService],
    })
], StreamingModule);
//# sourceMappingURL=streaming.module.js.map