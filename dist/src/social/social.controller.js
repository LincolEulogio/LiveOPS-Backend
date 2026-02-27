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
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
let SocialController = class SocialController {
    socialService;
    constructor(socialService) {
        this.socialService = socialService;
    }
    getMessages(productionId, status) {
        return this.socialService.getMessages(productionId, status);
    }
    getAiHighlights(productionId) {
        return this.socialService.getAiHighlights(productionId);
    }
    injectMessage(productionId, payload) {
        return this.socialService.ingestMessage(productionId, {
            ...payload,
            productionId,
        });
    }
    updateStatus(productionId, id, status) {
        return this.socialService.updateMessageStatus(productionId, id, status);
    }
    createPoll(productionId, payload) {
        return this.socialService.createPoll(productionId, payload.question, payload.options);
    }
    getActivePoll(productionId) {
        return this.socialService.getActivePoll(productionId);
    }
    votePoll(id, optionId) {
        return this.socialService.votePoll(id, optionId);
    }
    closePoll(productionId, id) {
        return this.socialService.closePoll(productionId, id);
    }
    getBlacklist(productionId) {
        return this.socialService.getBlacklist(productionId);
    }
    updateBlacklist(productionId, words) {
        this.socialService.setBlacklist(productionId, words);
        return { words };
    }
};
exports.SocialController = SocialController;
__decorate([
    (0, common_1.Get)('messages'),
    (0, permissions_decorator_1.Permissions)('social:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Get)('ai-highlights'),
    (0, permissions_decorator_1.Permissions)('social:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "getAiHighlights", null);
__decorate([
    (0, common_1.Post)('messages'),
    (0, permissions_decorator_1.Permissions)('social:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "injectMessage", null);
__decorate([
    (0, common_1.Put)('messages/:id/status'),
    (0, permissions_decorator_1.Permissions)('social:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)('polls'),
    (0, permissions_decorator_1.Permissions)('social:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "createPoll", null);
__decorate([
    (0, common_1.Get)('polls/active'),
    (0, permissions_decorator_1.Permissions)('social:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "getActivePoll", null);
__decorate([
    (0, common_1.Post)('polls/:id/vote'),
    (0, permissions_decorator_1.Permissions)('social:view'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('optionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "votePoll", null);
__decorate([
    (0, common_1.Delete)('polls/:id'),
    (0, permissions_decorator_1.Permissions)('social:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "closePoll", null);
__decorate([
    (0, common_1.Get)('blacklist'),
    (0, permissions_decorator_1.Permissions)('social:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "getBlacklist", null);
__decorate([
    (0, common_1.Put)('blacklist'),
    (0, permissions_decorator_1.Permissions)('social:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)('words')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "updateBlacklist", null);
exports.SocialController = SocialController = __decorate([
    (0, common_1.Controller)('productions/:productionId/social'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [social_service_1.SocialService])
], SocialController);
//# sourceMappingURL=social.controller.js.map