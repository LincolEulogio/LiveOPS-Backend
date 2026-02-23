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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = exports.NotificationPlatform = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = __importDefault(require("axios"));
var NotificationPlatform;
(function (NotificationPlatform) {
    NotificationPlatform["DISCORD"] = "DISCORD";
    NotificationPlatform["SLACK"] = "SLACK";
    NotificationPlatform["GENERIC"] = "GENERIC";
})(NotificationPlatform || (exports.NotificationPlatform = NotificationPlatform = {}));
let NotificationsService = NotificationsService_1 = class NotificationsService {
    prisma;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sendNotification(productionId, message, platform) {
        const webhooks = await this.prisma.webhook.findMany({
            where: {
                productionId,
                isEnabled: true,
                ...(platform ? { platform } : {}),
            },
        });
        if (webhooks.length === 0) {
            this.logger.debug(`No enabled webhooks found for production ${productionId}`);
            return;
        }
        const results = await Promise.allSettled(webhooks.map((webhook) => this.dispatchWebhook(webhook, message)));
        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
            this.logger.error(`${failures.length} webhook dispatches failed.`);
        }
    }
    async dispatchWebhook(webhook, message) {
        try {
            let payload;
            if (webhook.platform === NotificationPlatform.DISCORD) {
                payload = {
                    content: null,
                    embeds: [
                        {
                            title: 'LiveOPS Alert',
                            description: message,
                            color: 5814783,
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Source: ${webhook.name}`,
                            },
                        },
                    ],
                };
            }
            else if (webhook.platform === NotificationPlatform.SLACK) {
                payload = {
                    text: `*LiveOPS Alert:* ${message}`,
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkd-short',
                                text: `*LiveOPS Alert*\n${message}`,
                            },
                        },
                    ],
                };
            }
            else {
                payload = { message, timestamp: new Date().toISOString() };
            }
            await axios_1.default.post(webhook.url, payload);
            this.logger.log(`Successfully dispatched notification to ${webhook.name} (${webhook.platform})`);
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to dispatch notification to ${webhook.name}: ${err.message}`);
            throw err;
        }
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map