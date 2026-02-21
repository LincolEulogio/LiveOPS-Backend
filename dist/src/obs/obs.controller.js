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
exports.ObsController = void 0;
const common_1 = require("@nestjs/common");
const obs_service_1 = require("./obs.service");
const obs_dto_1 = require("./dto/obs.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let ObsController = class ObsController {
    obsService;
    constructor(obsService) {
        this.obsService = obsService;
    }
    saveConnection(productionId, dto) {
        return this.obsService.saveConnection(productionId, dto);
    }
    getConnection(productionId) {
        return this.obsService.getConnection(productionId);
    }
    changeScene(productionId, dto) {
        return this.obsService.changeScene(productionId, dto);
    }
    startStream(productionId) {
        return this.obsService.startStream(productionId);
    }
    stopStream(productionId) {
        return this.obsService.stopStream(productionId);
    }
};
exports.ObsController = ObsController;
__decorate([
    (0, common_1.Put)('connection'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, obs_dto_1.SaveObsConnectionDto]),
    __metadata("design:returntype", void 0)
], ObsController.prototype, "saveConnection", null);
__decorate([
    (0, common_1.Get)('connection'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ObsController.prototype, "getConnection", null);
__decorate([
    (0, common_1.Post)('scene'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, obs_dto_1.ChangeSceneDto]),
    __metadata("design:returntype", void 0)
], ObsController.prototype, "changeScene", null);
__decorate([
    (0, common_1.Post)('stream/start'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ObsController.prototype, "startStream", null);
__decorate([
    (0, common_1.Post)('stream/stop'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ObsController.prototype, "stopStream", null);
exports.ObsController = ObsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('productions/:productionId/obs'),
    __metadata("design:paramtypes", [obs_service_1.ObsService])
], ObsController);
//# sourceMappingURL=obs.controller.js.map