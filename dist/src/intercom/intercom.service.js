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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntercomService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const push_notifications_service_1 = require("../notifications/push-notifications.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const audit_service_1 = require("../common/services/audit.service");
let IntercomService = class IntercomService {
    prisma;
    eventEmitter;
    pushService;
    auditService;
    constructor(prisma, eventEmitter, pushService, auditService) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.pushService = pushService;
        this.auditService = auditService;
    }
    async createTemplate(productionId, dto) {
        return this.prisma.commandTemplate.create({
            data: {
                productionId,
                name: dto.name,
                description: dto.description,
                icon: dto.icon,
                color: dto.color,
            },
        });
    }
    async getTemplates(productionId) {
        const templates = await this.prisma.commandTemplate.findMany({
            where: { productionId },
            orderBy: { createdAt: 'asc' },
        });
        if (templates.length === 0) {
            console.log(`[Intercom] No templates found for production ${productionId}. Seeding defaults...`);
            await this.seedDefaultTemplates(productionId);
            return this.prisma.commandTemplate.findMany({
                where: { productionId },
                orderBy: { createdAt: 'asc' },
            });
        }
        console.log(`[Intercom] Found ${templates.length} templates for production ${productionId}`);
        return templates;
    }
    async seedDefaultTemplates(productionId) {
        const defaults = [
            { name: 'Prevenido', color: '#eab308' },
            { name: 'Al Aire', color: '#ef4444' },
            { name: 'Libre', color: '#22c55e' },
            { name: 'Más zoom', color: '#3b82f6' },
            { name: 'Menos zoom', color: '#3b82f6' },
            { name: 'Plano general', color: '#8b5cf6' },
            { name: 'Close up', color: '#8b5cf6' },
            { name: 'Foco', color: '#3b82f6' },
            { name: 'Silencio', color: '#ef4444' },
            { name: 'Hablando', color: '#f97316' },
            { name: 'Subir', color: '#22c55e' },
            { name: 'Bajar', color: '#ef4444' },
            { name: 'Pausa', color: '#64748b' },
            { name: 'Check', color: '#22c55e' },
        ];
        for (const t of defaults) {
            await this.prisma.commandTemplate.create({
                data: {
                    productionId,
                    name: t.name,
                    color: t.color,
                },
            });
        }
    }
    async updateTemplate(id, productionId, dto) {
        const template = await this.prisma.commandTemplate.findFirst({
            where: { id, productionId },
        });
        if (!template)
            throw new common_1.NotFoundException('Template not found in this production');
        return this.prisma.commandTemplate.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                icon: dto.icon,
                color: dto.color,
            },
        });
    }
    async deleteTemplate(id, productionId) {
        const template = await this.prisma.commandTemplate.findFirst({
            where: { id, productionId },
        });
        if (!template)
            throw new common_1.NotFoundException('Template not found in this production');
        return this.prisma.commandTemplate.delete({ where: { id } });
    }
    async getCommandHistory(productionId, limit = 50) {
        return this.prisma.command.findMany({
            where: { productionId },
            include: {
                sender: { select: { id: true, name: true } },
                targetRole: { select: { id: true, name: true } },
                template: true,
                responses: {
                    include: {
                        responder: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async sendCommand(dto) {
        const command = await this.prisma.command.create({
            data: {
                productionId: dto.productionId,
                senderId: dto.senderId,
                targetRoleId: dto.targetRoleId,
                targetUserId: dto.targetUserId,
                templateId: dto.templateId,
                message: dto.message,
                requiresAck: dto.requiresAck ?? true,
                status: 'SENT',
            },
            include: {
                sender: { select: { id: true, name: true } },
                targetRole: { select: { id: true, name: true } },
                template: true,
            },
        });
        this.eventEmitter.emit('command.created', {
            productionId: dto.productionId,
            command,
        });
        this.handlePushNotification(command);
        this.auditService.log({
            productionId: dto.productionId,
            userId: dto.senderId,
            action: audit_service_1.AuditAction.INTERCOM_SEND,
            details: {
                message: dto.message,
                targetUser: dto.targetUserId,
                targetRole: dto.targetRoleId,
            },
        });
        return command;
    }
    async handlePushNotification(command) {
        const { productionId, targetUserId, targetRoleId, message, sender } = command;
        if (targetUserId) {
            await this.pushService.sendNotification(targetUserId, {
                title: `Nuevo Comando de ${sender?.name || 'Director'}`,
                body: message,
                data: { productionId, commandId: command.id }
            });
        }
        else if (targetRoleId) {
            const usersInRole = await this.prisma.productionUser.findMany({
                where: { productionId, roleId: targetRoleId },
                select: { userId: true },
            });
            for (const { userId } of usersInRole) {
                await this.pushService.sendNotification(userId, {
                    title: `Alerta de Producción: ${message}`,
                    body: 'Revisa tu panel para más detalles.',
                    data: { productionId, commandId: command.id }
                });
            }
        }
    }
};
exports.IntercomService = IntercomService;
exports.IntercomService = IntercomService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2,
        push_notifications_service_1.PushNotificationsService,
        audit_service_1.AuditService])
], IntercomService);
//# sourceMappingURL=intercom.service.js.map