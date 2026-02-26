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
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const media_service_1 = require("./media.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class SaveAssetDto {
    name;
    url;
    type;
    size;
    mimeType;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SaveAssetDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SaveAssetDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.AssetType),
    __metadata("design:type", String)
], SaveAssetDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SaveAssetDto.prototype, "size", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveAssetDto.prototype, "mimeType", void 0);
let MediaController = class MediaController {
    mediaService;
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    async getAssets(productionId) {
        return this.mediaService.getAssets(productionId);
    }
    async saveAsset(productionId, body) {
        return this.mediaService.saveAsset({ ...body, productionId });
    }
    async deleteAsset(productionId, id) {
        return this.mediaService.deleteAsset(id, productionId);
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Get)('assets/:productionId'),
    (0, permissions_decorator_1.Permissions)('media:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getAssets", null);
__decorate([
    (0, common_1.Post)('assets/:productionId'),
    (0, permissions_decorator_1.Permissions)('media:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SaveAssetDto]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "saveAsset", null);
__decorate([
    (0, common_1.Delete)('assets/:productionId/:id'),
    (0, permissions_decorator_1.Permissions)('media:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "deleteAsset", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)('media'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
//# sourceMappingURL=media.controller.js.map