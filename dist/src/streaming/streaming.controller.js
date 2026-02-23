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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingController = void 0;
const common_1 = require("@nestjs/common");
const streaming_service_1 = require("./streaming.service");
const streaming_destinations_service_1 = require("./streaming-destinations.service");
const streaming_command_dto_1 = require("./dto/streaming-command.dto");
const streaming_destination_dto_1 = require("./dto/streaming-destination.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let StreamingController = class StreamingController {
    streamingService;
    destinationsService;
    constructor(streamingService, destinationsService) {
        this.streamingService = streamingService;
        this.destinationsService = destinationsService;
    }
    getState(productionId) {
        return this.streamingService.getStreamingState(productionId);
    }
    sendCommand(productionId, dto) {
        return this.streamingService.handleCommand(productionId, dto);
    }
    getDestinations(productionId) {
        return this.destinationsService.findAll(productionId);
    }
    createDestination(productionId, dto) {
        return this.destinationsService.create(productionId, dto);
    }
    updateDestination(id, dto) {
        return this.destinationsService.update(id, dto);
    }
    removeDestination(id) {
        return this.destinationsService.remove(id);
    }
};
exports.StreamingController = StreamingController;
__decorate([
    (0, common_1.Get)(':id/state'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StreamingController.prototype, "getState", null);
__decorate([
    (0, common_1.Post)(':id/command'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, streaming_command_dto_1.StreamingCommandDto]),
    __metadata("design:returntype", void 0)
], StreamingController.prototype, "sendCommand", null);
__decorate([
    (0, common_1.Get)(':id/destinations'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StreamingController.prototype, "getDestinations", null);
__decorate([
    (0, common_1.Post)(':id/destinations'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, streaming_destination_dto_1.CreateStreamingDestinationDto]),
    __metadata("design:returntype", void 0)
], StreamingController.prototype, "createDestination", null);
__decorate([
    (0, common_1.Put)('destinations/:destId'),
    __param(0, (0, common_1.Param)('destId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, streaming_destination_dto_1.UpdateStreamingDestinationDto]),
    __metadata("design:returntype", void 0)
], StreamingController.prototype, "updateDestination", null);
__decorate([
    (0, common_1.Delete)('destinations/:destId'),
    __param(0, (0, common_1.Param)('destId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StreamingController.prototype, "removeDestination", null);
exports.StreamingController = StreamingController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('streaming'),
    __metadata("design:paramtypes", [streaming_service_1.StreamingService,
        streaming_destinations_service_1.StreamingDestinationsService])
], StreamingController);
//# sourceMappingURL=streaming.controller.js.map