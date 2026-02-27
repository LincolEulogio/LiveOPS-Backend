import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PushNotificationsService } from '@/notifications/push-notifications.service';
import {
  CreateCommandTemplateDto,
  SendCommandDto,
} from '@/intercom/dto/intercom.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService, AuditAction } from '@/common/services/audit.service';
import { AiService } from '@/ai/ai.service';

@Injectable()
export class IntercomService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private pushService: PushNotificationsService,
    private auditService: AuditService,
    private aiService: AiService,
  ) {}

  async createTemplate(productionId: string, dto: CreateCommandTemplateDto) {
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

  async getTemplates(productionId: string) {
    const templates = await this.prisma.commandTemplate.findMany({
      where: { productionId },
      orderBy: { createdAt: 'asc' },
    });

    if (templates.length === 0) {
      console.log(
        `[Intercom] No templates found for production ${productionId}. Seeding defaults...`,
      );
      await this.seedDefaultTemplates(productionId);
      return this.prisma.commandTemplate.findMany({
        where: { productionId },
        orderBy: { createdAt: 'asc' },
      });
    }
    console.log(
      `[Intercom] Found ${templates.length} templates for production ${productionId}`,
    );

    return templates;
  }

  private async seedDefaultTemplates(productionId: string) {
    const defaults = [
      { name: 'Prevenido', color: '#eab308' }, // Yellow
      { name: 'Al Aire', color: '#ef4444' }, // Red
      { name: 'Libre', color: '#22c55e' }, // Green
      { name: 'Más zoom', color: '#3b82f6' }, // Blue
      { name: 'Menos zoom', color: '#3b82f6' },
      { name: 'Plano general', color: '#8b5cf6' }, // Purple
      { name: 'Close up', color: '#8b5cf6' },
      { name: 'Foco', color: '#3b82f6' },
      { name: 'Silencio', color: '#ef4444' },
      { name: 'Hablando', color: '#f97316' }, // Orange
      { name: 'Subir', color: '#22c55e' },
      { name: 'Bajar', color: '#ef4444' },
      { name: 'Pausa', color: '#64748b' }, // Slate
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

  async updateTemplate(
    id: string,
    productionId: string,
    dto: CreateCommandTemplateDto,
  ) {
    const template = await this.prisma.commandTemplate.findFirst({
      where: { id, productionId },
    });
    if (!template)
      throw new NotFoundException('Template not found in this production');

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

  async deleteTemplate(id: string, productionId: string) {
    const template = await this.prisma.commandTemplate.findFirst({
      where: { id, productionId },
    });
    if (!template)
      throw new NotFoundException('Template not found in this production');

    return this.prisma.commandTemplate.delete({ where: { id } });
  }

  async getCommandHistory(productionId: string, limit: number = 50) {
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

  async getAiSummary(productionId: string) {
    const history = await this.getCommandHistory(productionId, 20);
    const summary = await this.aiService.summarizeIntercom(history);
    return { summary };
  }

  async summarizeHistory(productionId: string) {
    const history = await this.getCommandHistory(productionId, 20);
    const summary = await this.aiService.summarizeIntercom(history);
    return { summary };
  }

  async sendCommand(dto: SendCommandDto) {
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

    // Emit Internal Event (Gateway will listen to this)
    this.eventEmitter.emit('command.created', {
      productionId: dto.productionId,
      command,
    });

    // --- PWA Push Notification Logic ---
    this.handlePushNotification(command);

    // --- Audit Logging ---
    this.auditService.log({
      productionId: dto.productionId,
      userId: dto.senderId,
      action: AuditAction.INTERCOM_SEND,
      details: {
        message: dto.message,
        targetUser: dto.targetUserId,
        targetRole: dto.targetRoleId,
      },
    });

    return command;
  }

  private async handlePushNotification(command: any) {
    try {
      const { productionId, targetUserId, targetRoleId, message, sender } =
        command;

      if (targetUserId) {
        // Direct notification to a specific user
        await this.pushService.sendNotification(targetUserId, {
          title: `Nuevo Comando de ${sender?.name || 'Director'}`,
          body: message,
          data: { productionId, commandId: command.id },
        });
      } else if (targetRoleId) {
        // Notify all users with this role in the production
        const usersInRole = await this.prisma.productionUser.findMany({
          where: { productionId, roleId: targetRoleId },
          select: { userId: true },
        });

        for (const { userId } of usersInRole) {
          try {
            await this.pushService.sendNotification(userId, {
              title: `Alerta de Producción: ${message}`,
              body: 'Revisa tu panel para más detalles.',
              data: { productionId, commandId: command.id },
            });
          } catch (innerError) {
            console.error(
              `[Intercom] Failed to send push to individual user ${userId}:`,
              innerError.message,
            );
          }
        }
      }
    } catch (error) {
      console.error(
        '[Intercom] Error in handlePushNotification:',
        error.message,
      );
    }
  }
}
