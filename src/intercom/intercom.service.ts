import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommandTemplateDto, SendCommandDto } from './dto/intercom.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class IntercomService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) { }

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

    this.eventEmitter.emit('command.created', {
      productionId: dto.productionId,
      command,
    });

    return command;
  }
}
