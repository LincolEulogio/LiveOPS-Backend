import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/common/services/audit.service';
import { Role } from '@/common/constants/roles.enum';
import {
  CloneProductionDto,
  SaveAsTemplateDto,
  CreateFromTemplateDto,
} from './dto/production.dto';
import { TemplateConfig } from './productions.types';

@Injectable()
export class ProductionsTemplatesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async cloneProduction(productionId: string, userId: string, dto: CloneProductionDto) {
    const source = await this.prisma.production.findFirst({
      where: { id: productionId, deletedAt: null },
      include: {
        rules: {
          include: {
            triggers: true,
            actions: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
    if (!source) throw new NotFoundException('Production not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.tenantId) throw new ConflictException('User has no tenant');

    const adminRole = await this.prisma.role.findUnique({ where: { name: Role.ADMIN } });
    if (!adminRole) throw new NotFoundException('Admin role not found');

    return this.prisma.$transaction(async (tx) => {
      const clone = await tx.production.create({
        data: {
          name: dto.name,
          description: source.description,
          engineType: source.engineType,
          status: 'DRAFT',
          tenantId: user.tenantId,
          users: { create: { userId, roleId: adminRole.id } },
          rules: {
            create: source.rules.map((rule) => ({
              name: rule.name,
              description: rule.description,
              isEnabled: rule.isEnabled,
              triggers: {
                create: rule.triggers.map(({ eventType, condition }) => ({
                  eventType,
                  condition: condition ?? Prisma.JsonNull,
                })),
              },
              actions: {
                create: rule.actions.map(({ actionType, payload, order }) => ({
                  actionType,
                  payload: payload ?? Prisma.JsonNull,
                  order,
                })),
              },
            })),
          },
        },
      });

      void this.auditService.log({
        productionId: clone.id,
        userId,
        action: 'PRODUCTION_CLONE',
        details: { sourceId: productionId, name: clone.name },
      });

      void this.prisma.productionLog.create({
        data: {
          productionId: clone.id,
          userId,
          eventType: 'PRODUCTION_CLONE',
          details: { sourceId: productionId },
        },
      });

      return clone;
    });
  }

  async saveAsTemplate(productionId: string, userId: string, dto: SaveAsTemplateDto) {
    const source = await this.prisma.production.findFirst({
      where: { id: productionId, deletedAt: null },
      include: {
        rules: {
          include: {
            triggers: true,
            actions: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
    if (!source) throw new NotFoundException('Production not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const config: TemplateConfig = {
      rules: source.rules.map((rule) => ({
        name: rule.name,
        description: rule.description,
        isEnabled: rule.isEnabled,
        triggers: rule.triggers.map(({ eventType, condition }) => ({
          eventType,
          condition: condition as Prisma.JsonValue,
        })),
        actions: rule.actions.map(({ actionType, payload, order }) => ({
          actionType,
          payload: payload as Prisma.JsonValue,
          order,
        })),
      })),
    };

    return this.prisma.productionTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        engineType: source.engineType,
        tenantId: user?.tenantId ?? null,
        config: config as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listTemplates(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return this.prisma.productionTemplate.findMany({
      where: {
        OR: [
          { tenantId: user?.tenantId ?? undefined },
          { tenantId: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFromTemplate(templateId: string, userId: string, dto: CreateFromTemplateDto) {
    const template = await this.prisma.productionTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Template not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.tenantId) throw new ConflictException('User has no tenant');

    const adminRole = await this.prisma.role.findUnique({ where: { name: Role.ADMIN } });
    if (!adminRole) throw new NotFoundException('Admin role not found');

    const config = template.config as unknown as TemplateConfig;

    return this.prisma.$transaction(async (tx) =>
      tx.production.create({
        data: {
          name: dto.name,
          description: template.description,
          engineType: template.engineType,
          status: 'DRAFT',
          tenantId: user.tenantId,
          users: { create: { userId, roleId: adminRole.id } },
          rules: {
            create: config.rules.map((rule) => ({
              name: rule.name,
              description: rule.description,
              isEnabled: rule.isEnabled,
              triggers: {
                create: rule.triggers.map(({ eventType, condition }) => ({
                  eventType,
                  condition: condition ?? Prisma.JsonNull,
                })),
              },
              actions: {
                create: rule.actions.map(({ actionType, payload, order }) => ({
                  actionType,
                  payload: payload ?? Prisma.JsonNull,
                  order,
                })),
              },
            })),
          },
        },
      }),
    );
  }
}
