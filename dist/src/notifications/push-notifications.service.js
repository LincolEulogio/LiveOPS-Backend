"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PushNotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const webpush = __importStar(require("web-push"));
let PushNotificationsService = PushNotificationsService_1 = class PushNotificationsService {
    prisma;
    configService;
    logger = new common_1.Logger(PushNotificationsService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    onModuleInit() {
        const publicKey = this.configService.get('VAPID_PUBLIC_KEY');
        const privateKey = this.configService.get('VAPID_PRIVATE_KEY');
        const email = this.configService.get('VAPID_EMAIL', 'admin@liveops.com');
        if (publicKey && privateKey) {
            webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
            this.logger.log('VAPID details set successfully');
        }
        else {
            this.logger.warn('VAPID keys not found in config. Push notifications will not work.');
        }
    }
    async subscribe(userId, subscription) {
        const { endpoint, keys } = subscription;
        return this.prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                userId,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
            create: {
                userId,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
        });
    }
    async unsubscribe(endpoint) {
        return this.prisma.pushSubscription.deleteMany({
            where: { endpoint },
        });
    }
    async sendNotification(userId, payload) {
        const subscriptions = await this.prisma.pushSubscription.findMany({
            where: { userId },
        });
        if (subscriptions.length === 0) {
            this.logger.debug(`No push subscriptions found for user ${userId}`);
            return;
        }
        const notificationPayload = JSON.stringify(payload);
        const results = await Promise.allSettled(subscriptions.map((sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            };
            return webpush.sendNotification(pushSubscription, notificationPayload);
        }));
        for (const result of results) {
            if (result.status === 'rejected') {
                const error = result.reason;
                if (error.statusCode === 410 || error.statusCode === 404) {
                    this.logger.log(`Removing expired subscription: ${error.endpoint}`);
                }
                else {
                    this.logger.error(`Failed to send push notification: ${error.message}`);
                }
            }
        }
    }
};
exports.PushNotificationsService = PushNotificationsService;
exports.PushNotificationsService = PushNotificationsService = PushNotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], PushNotificationsService);
//# sourceMappingURL=push-notifications.service.js.map