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
var HealthAlertService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthAlertService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const notifications_service_1 = require("./notifications.service");
let HealthAlertService = HealthAlertService_1 = class HealthAlertService {
    notificationsService;
    logger = new common_1.Logger(HealthAlertService_1.name);
    lastAlerts = new Map();
    ALERT_COOLDOWN = 60000;
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    async handleHealthStats(payload) {
        if (!payload.isStreaming)
            return;
        const issues = [];
        if (payload.cpuUsage > 85) {
            issues.push(`🔥 Critical CPU Usage: ${payload.cpuUsage.toFixed(1)}%`);
        }
        if (payload.skippedFrames > 0) {
            issues.push(`⚠️ Dropped Frames Detected: ${payload.skippedFrames}`);
        }
        if (issues.length > 0) {
            await this.triggerAlert(payload.productionId, issues.join('\n'));
        }
    }
    async triggerAlert(productionId, message) {
        const now = Date.now();
        const lastTime = this.lastAlerts.get(productionId) || 0;
        if (now - lastTime < this.ALERT_COOLDOWN) {
            return;
        }
        this.logger.warn(`Health Alert for ${productionId}: ${message}`);
        this.lastAlerts.set(productionId, now);
        await this.notificationsService.sendNotification(productionId, `🚨 *Stream Health Warning*\n${message}`);
    }
};
exports.HealthAlertService = HealthAlertService;
__decorate([
    (0, event_emitter_1.OnEvent)('production.health.stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthAlertService.prototype, "handleHealthStats", null);
exports.HealthAlertService = HealthAlertService = HealthAlertService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], HealthAlertService);
//# sourceMappingURL=health-alert.service.js.map