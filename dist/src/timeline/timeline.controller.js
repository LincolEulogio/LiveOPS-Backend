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
exports.TimelineController = void 0;
const common_1 = require("@nestjs/common");
const timeline_service_1 = require("./timeline.service");
const timeline_dto_1 = require("./dto/timeline.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const rbac_constants_1 = require("../common/constants/rbac.constants");
let TimelineController = class TimelineController {
    timelineService;
    constructor(timelineService) {
        this.timelineService = timelineService;
    }
    getBlocks(productionId) {
        return this.timelineService.getBlocks(productionId);
    }
    getAiAdvice(productionId) {
        return this.timelineService.getAiAdvice(productionId);
    }
    createBlock(productionId, dto) {
        return this.timelineService.createBlock(productionId, dto);
    }
    reorderBlocks(productionId, dto) {
        return this.timelineService.reorderBlocks(productionId, dto.blockIds);
    }
    updateBlock(productionId, id, dto) {
        return this.timelineService.updateBlock(id, productionId, dto);
    }
    deleteBlock(productionId, id) {
        return this.timelineService.deleteBlock(id, productionId);
    }
    startBlock(productionId, id) {
        return this.timelineService.startBlock(id, productionId);
    }
    completeBlock(productionId, id) {
        return this.timelineService.completeBlock(id, productionId);
    }
    resetBlock(productionId, id) {
        return this.timelineService.resetBlock(id, productionId);
    }
};
exports.TimelineController = TimelineController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)(rbac_constants_1.PermissionAction.RUNDOWN_VIEW),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TimelineController.prototype, "getBlocks", null);
__decorate([
    (0, common_1.Get)('ai-advice'),
    (0, permissions_decorator_1.Permissions)(rbac_constants_1.PermissionAction.RUNDOWN_VIEW),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TimelineController.prototype, "getAiAdvice", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)(rbac_constants_1.PermissionAction.RUNDOWN_EDIT),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, timeline_dto_1.CreateTimelineBlockDto]),
    __metadata("design:returntype", void 0)
], TimelineController.prototype, "createBlock", null);
__decorate([
    (0, common_1.Put)('reorder'),
    (0, permissions_decorator_1.Permissions)(rbac_constants_1.PermissionAction.RUNDOWN_EDIT),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, timeline_dto_1.ReorderBlocksDto]),
    __metadata("design:returntype", void 0)
], TimelineController.prototype, "reorderBlocks", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)(rbac_constants_1.PermissionAction.RUNDOWN_EDIT),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, timeline_dto_1.UpdateTimelineBlockDto]),
    __metadata("design:returntype", void 0)
], TimelineController.prototype, "updateBlock", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)(rbac_constants_1.PermissionAction.RUNDOWN_EDIT),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TimelineController.prototype, "deleteBlock", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    (0, permissions_decorator_1.Permissions)(rbac_constants_1.PermissionAction.RUNDOWN_CONTROL),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TimelineController.prototype, "startBlock", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    (0, permissions_decorator_1.Permissions)(rbac_constants_1.PermissionAction.RUNDOWN_CONTROL),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TimelineController.prototype, "completeBlock", null);
__decorate([
    (0, common_1.Post)(':id/reset'),
    (0, permissions_decorator_1.Permissions)(rbac_constants_1.PermissionAction.RUNDOWN_CONTROL),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TimelineController.prototype, "resetBlock", null);
exports.TimelineController = TimelineController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('productions/:productionId/timeline'),
    __metadata("design:paramtypes", [timeline_service_1.TimelineService])
], TimelineController);
//# sourceMappingURL=timeline.controller.js.map