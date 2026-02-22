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
exports.SocialController = void 0;
const common_1 = require("@nestjs/common");
const social_service_1 = require("./social.service");
let SocialController = class SocialController {
    socialService;
    constructor(socialService) {
        this.socialService = socialService;
    }
    async mockComment(productionId, comment) {
        return this.socialService.handleIncomingComment(productionId, comment);
    }
    async setOverlay(productionId, comment) {
        return this.socialService.selectCommentForOverlay(productionId, comment);
    }
    async getActiveOverlay(productionId) {
        return this.socialService.getActiveOverlay(productionId);
    }
};
exports.SocialController = SocialController;
__decorate([
    (0, common_1.Post)(':productionId/mock-comment'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, social_service_1.SocialComment]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "mockComment", null);
__decorate([
    (0, common_1.Post)(':productionId/overlay'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "setOverlay", null);
__decorate([
    (0, common_1.Get)(':productionId/active-overlay'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "getActiveOverlay", null);
exports.SocialController = SocialController = __decorate([
    (0, common_1.Controller)('social'),
    __metadata("design:paramtypes", [social_service_1.SocialService])
], SocialController);
//# sourceMappingURL=social.controller.js.map