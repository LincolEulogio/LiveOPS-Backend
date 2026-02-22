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
var ProductionsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionsController = void 0;
const common_1 = require("@nestjs/common");
const productions_service_1 = require("./productions.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const production_dto_1 = require("./dto/production.dto");
let ProductionsController = ProductionsController_1 = class ProductionsController {
    productionsService;
    logger = new common_1.Logger(ProductionsController_1.name);
    constructor(productionsService) {
        this.productionsService = productionsService;
    }
    create(req, dto) {
        return this.productionsService.create(req.user.userId, dto);
    }
    findAll(req, query) {
        return this.productionsService.findAllForUser(req.user.userId, query);
    }
    findOne(id, req) {
        return this.productionsService.findOne(id, req.user.userId);
    }
    update(id, dto) {
        return this.productionsService.update(id, dto);
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
    remove(id) {
        this.logger.log(`Handling delete request for production: ${id}`);
        return this.productionsService.remove(id);
    }
};
exports.ProductionsController = ProductionsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('production:create'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, production_dto_1.CreateProductionDto]),
    __metadata("design:returntype", void 0)
], ProductionsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, production_dto_1.GetProductionsQueryDto]),
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
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.Permissions)('production:manage'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, production_dto_1.UpdateProductionDto]),
    __metadata("design:returntype", void 0)
], ProductionsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/state'),
    (0, permissions_decorator_1.Permissions)('production:manage'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, production_dto_1.UpdateProductionStateDto]),
    __metadata("design:returntype", void 0)
], ProductionsController.prototype, "updateState", null);
__decorate([
    (0, common_1.Post)(':id/users'),
    (0, permissions_decorator_1.Permissions)('production:manage'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, production_dto_1.AssignUserDto]),
    __metadata("design:returntype", void 0)
], ProductionsController.prototype, "assignUser", null);
__decorate([
    (0, common_1.Delete)(':id/users/:userId'),
    (0, permissions_decorator_1.Permissions)('production:manage'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ProductionsController.prototype, "removeUser", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('production:manage'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductionsController.prototype, "remove", null);
exports.ProductionsController = ProductionsController = ProductionsController_1 = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('productions'),
    __metadata("design:paramtypes", [productions_service_1.ProductionsService])
], ProductionsController);
//# sourceMappingURL=productions.controller.js.map