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
exports.ProductionsController = void 0;
const common_1 = require("@nestjs/common");
const productions_service_1 = require("./productions.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const production_dto_1 = require("./dto/production.dto");
let ProductionsController = class ProductionsController {
    productionsService;
    constructor(productionsService) {
        this.productionsService = productionsService;
    }
    create(req, dto) {
        return this.productionsService.create(req.user.userId, dto);
    }
    findAll(req) {
        return this.productionsService.findAllForUser(req.user.userId);
    }
    findOne(id, req) {
        return this.productionsService.findOne(id, req.user.userId);
    }
    updateState(id, dto) {
        return this.productionsService.updateState(id, dto);
    }
    assignUser(id, dto) {
        return this.productionsService.assignUser(id, dto);
    }
    removeUser(id, userId) {
        return this.productionsService.removeUser(id, userId);
    }
};
exports.ProductionsController = ProductionsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, production_dto_1.CreateProductionDto]),
    __metadata("design:returntype", void 0)
], ProductionsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProductionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProductionsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/state'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, production_dto_1.UpdateProductionStateDto]),
    __metadata("design:returntype", void 0)
], ProductionsController.prototype, "updateState", null);
__decorate([
    (0, common_1.Post)(':id/users'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, production_dto_1.AssignUserDto]),
    __metadata("design:returntype", void 0)
], ProductionsController.prototype, "assignUser", null);
__decorate([
    (0, common_1.Delete)(':id/users/:userId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ProductionsController.prototype, "removeUser", null);
exports.ProductionsController = ProductionsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('productions'),
    __metadata("design:paramtypes", [productions_service_1.ProductionsService])
], ProductionsController);
//# sourceMappingURL=productions.controller.js.map