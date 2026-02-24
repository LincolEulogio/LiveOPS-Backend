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
exports.WebhooksController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("./notifications.service");
const push_notifications_service_1 = require("./push-notifications.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
let WebhooksController = class WebhooksController {
    prisma;
    notificationsService;
    pushService;
    constructor(prisma, notificationsService, pushService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.pushService = pushService;
    }
    async getWebhooks(productionId) {
        return this.prisma.webhook.findMany({
            where: { productionId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createWebhook(productionId, data) {
        return this.prisma.webhook.create({
            data: {
                ...data,
                productionId,
            },
        });
    }
    async updateWebhook(id, data) {
        return this.prisma.webhook.update({
            where: { id },
            data,
        });
    }
    async deleteWebhook(id) {
        return this.prisma.webhook.delete({
            where: { id },
        });
    }
    async testWebhook(id) {
        const webhook = await this.prisma.webhook.findUnique({
            where: { id },
        });
        if (!webhook) {
            throw new Error('Webhook not found');
        }
        await this.notificationsService.sendNotification(webhook.productionId, `🔄 *LiveOPS Webhook Test*\nThis is a test notification for the ${webhook.name} integration.`, webhook.platform);
        return { success: true };
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, common_1.Get)('webhooks/:productionId'),
    (0, permissions_decorator_1.Permissions)('webhook:view'),
    __param(0, (0, common_1.Param)('productionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "getWebhooks", null);
__decorate([
    (0, common_1.Post)('webhooks'),
    (0, permissions_decorator_1.Permissions)('webhook:manage'),
    __param(0, (0, common_1.Param)('productionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "createWebhook", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.Permissions)('webhook:manage'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "updateWebhook", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('webhook:manage'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "deleteWebhook", null);
__decorate([
    (0, common_1.Post)(':id/test'),
    (0, permissions_decorator_1.Permissions)('webhook:manage'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "testWebhook", null);
exports.WebhooksController = WebhooksController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        push_notifications_service_1.PushNotificationsService])
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map