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
exports.AutomationController = void 0;
const common_1 = require("@nestjs/common");
const automation_service_1 = require("./automation.service");
const automation_dto_1 = require("./dto/automation.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
let AutomationController = class AutomationController {
    automationService;
    constructor(automationService) {
        this.automationService = automationService;
    }
    getRules(productionId) {
        return this.automationService.getRules(productionId);
    }
    createRule(productionId, dto) {
        return this.automationService.createRule(productionId, dto);
    }
    getRule(productionId, id) {
        return this.automationService.getRule(id, productionId);
    }
    updateRule(productionId, id, dto) {
        return this.automationService.updateRule(id, productionId, dto);
    }
    deleteRule(productionId, id) {
        return this.automationService.deleteRule(id, productionId);
    }
    getExecutionLogs(productionId) {
        return this.automationService.getExecutionLogs(productionId);
    }
    triggerInstantClip(productionId) {
        return this.automationService.triggerInstantClip(productionId);
    }
};
exports.AutomationController = AutomationController;
__decorate([
    (0, common_1.Get)('rules'),
    (0, permissions_decorator_1.Permissions)('automation:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "getRules", null);
__decorate([
    (0, common_1.Post)('rules'),
    (0, permissions_decorator_1.Permissions)('automation:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, automation_dto_1.CreateRuleDto]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "createRule", null);
__decorate([
    (0, common_1.Get)('rules/:id'),
    (0, permissions_decorator_1.Permissions)('automation:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "getRule", null);
__decorate([
    (0, common_1.Put)('rules/:id'),
    (0, permissions_decorator_1.Permissions)('automation:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, automation_dto_1.UpdateRuleDto]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Delete)('rules/:id'),
    (0, permissions_decorator_1.Permissions)('automation:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "deleteRule", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, permissions_decorator_1.Permissions)('automation:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "getExecutionLogs", null);
__decorate([
    (0, common_1.Post)('instant-clip'),
    (0, permissions_decorator_1.Permissions)('automation:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "triggerInstantClip", null);
exports.AutomationController = AutomationController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('productions/:productionId/automation'),
    __metadata("design:paramtypes", [automation_service_1.AutomationService])
], AutomationController);
//# sourceMappingURL=automation.controller.js.map