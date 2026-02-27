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
exports.IntercomController = void 0;
const common_1 = require("@nestjs/common");
const intercom_service_1 = require("./intercom.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const intercom_dto_1 = require("./dto/intercom.dto");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
let IntercomController = class IntercomController {
    intercomService;
    constructor(intercomService) {
        this.intercomService = intercomService;
    }
    createTemplate(productionId, dto) {
        return this.intercomService.createTemplate(productionId, dto);
    }
    getTemplates(productionId) {
        return this.intercomService.getTemplates(productionId);
    }
    updateTemplate(productionId, id, dto) {
        return this.intercomService.updateTemplate(id, productionId, dto);
    }
    deleteTemplate(productionId, id) {
        return this.intercomService.deleteTemplate(id, productionId);
    }
    getCommandHistory(productionId) {
        return this.intercomService.getCommandHistory(productionId);
    }
    getAiSummary(productionId) {
        return this.intercomService.getAiSummary(productionId);
    }
};
exports.IntercomController = IntercomController;
__decorate([
    (0, common_1.Post)('templates'),
    (0, permissions_decorator_1.Permissions)('intercom:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, intercom_dto_1.CreateCommandTemplateDto]),
    __metadata("design:returntype", void 0)
], IntercomController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Get)('templates'),
    (0, permissions_decorator_1.Permissions)('intercom:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IntercomController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Put)('templates/:id'),
    (0, permissions_decorator_1.Permissions)('intercom:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, intercom_dto_1.CreateCommandTemplateDto]),
    __metadata("design:returntype", void 0)
], IntercomController.prototype, "updateTemplate", null);
__decorate([
    (0, common_1.Delete)('templates/:id'),
    (0, permissions_decorator_1.Permissions)('intercom:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], IntercomController.prototype, "deleteTemplate", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, permissions_decorator_1.Permissions)('intercom:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IntercomController.prototype, "getCommandHistory", null);
__decorate([
    (0, common_1.Get)('ai-summary'),
    (0, permissions_decorator_1.Permissions)('intercom:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IntercomController.prototype, "getAiSummary", null);
exports.IntercomController = IntercomController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('productions/:productionId/intercom'),
    __metadata("design:paramtypes", [intercom_service_1.IntercomService])
], IntercomController);
//# sourceMappingURL=intercom.controller.js.map