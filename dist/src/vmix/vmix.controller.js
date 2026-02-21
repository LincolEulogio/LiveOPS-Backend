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
exports.VmixController = void 0;
const common_1 = require("@nestjs/common");
const vmix_service_1 = require("./vmix.service");
const vmix_dto_1 = require("./dto/vmix.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let VmixController = class VmixController {
    vmixService;
    constructor(vmixService) {
        this.vmixService = vmixService;
    }
    saveConnection(productionId, dto) {
        return this.vmixService.saveConnection(productionId, dto);
    }
    getConnection(productionId) {
        return this.vmixService.getConnection(productionId);
    }
    changeInput(productionId, dto) {
        return this.vmixService.changeInput(productionId, dto);
    }
    cut(productionId) {
        return this.vmixService.cut(productionId);
    }
    fade(productionId) {
        return this.vmixService.fade(productionId);
    }
};
exports.VmixController = VmixController;
__decorate([
    (0, common_1.Put)('connection'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, vmix_dto_1.SaveVmixConnectionDto]),
    __metadata("design:returntype", void 0)
], VmixController.prototype, "saveConnection", null);
__decorate([
    (0, common_1.Get)('connection'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VmixController.prototype, "getConnection", null);
__decorate([
    (0, common_1.Post)('input'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, vmix_dto_1.ChangeInputDto]),
    __metadata("design:returntype", void 0)
], VmixController.prototype, "changeInput", null);
__decorate([
    (0, common_1.Post)('transition/cut'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VmixController.prototype, "cut", null);
__decorate([
    (0, common_1.Post)('transition/fade'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VmixController.prototype, "fade", null);
exports.VmixController = VmixController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('productions/:productionId/vmix'),
    __metadata("design:paramtypes", [vmix_service_1.VmixService])
], VmixController);
//# sourceMappingURL=vmix.controller.js.map