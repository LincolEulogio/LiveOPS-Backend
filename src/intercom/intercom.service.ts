import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommandTemplateDto } from './dto/intercom.dto';

@Injectable()
export class IntercomService {
    constructor(private prisma: PrismaService) { }

    async createTemplate(productionId: string, dto: CreateCommandTemplateDto) {
        return this.prisma.commandTemplate.create({
            data: {
                productionId,
                name: dto.name,
                description: dto.description,
                icon: dto.icon,
                color: dto.color,
            }
        });
    }

    async getTemplates(productionId: string) {
        return this.prisma.commandTemplate.findMany({
            where: { productionId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async deleteTemplate(id: string, productionId: string) {
        const template = await this.prisma.commandTemplate.findFirst({
            where: { id, productionId }
        });
        if (!template) throw new NotFoundException('Template not found in this production');

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
                        responder: { select: { id: true, name: true } }
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
}
