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
exports.OverlaysController = void 0;
const common_1 = require("@nestjs/common");
const overlays_service_1 = require("./overlays.service");
const overlay_dto_1 = require("./dto/overlay.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let OverlaysController = class OverlaysController {
    overlaysService;
    constructor(overlaysService) {
        this.overlaysService = overlaysService;
    }
    create(productionId, dto) {
        return this.overlaysService.create(productionId, dto);
    }
    findAll(productionId) {
        return this.overlaysService.findAll(productionId);
    }
    findOne(id) {
        return this.overlaysService.findOne(id);
    }
    update(id, dto) {
        return this.overlaysService.update(id, dto);
    }
    remove(id) {
        return this.overlaysService.remove(id);
    }
    toggleActive(id, productionId, isActive) {
        return this.overlaysService.toggleActive(id, productionId, isActive);
    }
};
exports.OverlaysController = OverlaysController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, overlay_dto_1.CreateOverlayDto]),
    __metadata("design:returntype", void 0)
], OverlaysController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OverlaysController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OverlaysController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, overlay_dto_1.UpdateOverlayDto]),
    __metadata("design:returntype", void 0)
], OverlaysController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OverlaysController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('productionId')),
    __param(2, (0, common_1.Body)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Boolean]),
    __metadata("design:returntype", void 0)
], OverlaysController.prototype, "toggleActive", null);
exports.OverlaysController = OverlaysController = __decorate([
    (0, common_1.Controller)('productions/:productionId/overlays'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [overlays_service_1.OverlaysService])
], OverlaysController);
//# sourceMappingURL=overlays.controller.js.map