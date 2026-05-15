import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, ProductionStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ObsService } from '@/obs/obs.service';
import { VmixService } from '@/vmix/vmix.service';
import { AuditService } from '@/common/services/audit.service';
import { Role } from '@/common/constants/roles.enum';
import {
  CreateProductionDto,
  UpdateProductionDto,
  UpdateProductionStateDto,
  AssignUserDto,
  EngineType,
  GetProductionsQueryDto,
  PaginationQueryDto,
  CloneProductionDto,
  SaveAsTemplateDto,
  CreateFromTemplateDto,
} from './dto/production.dto';
import { ProductionsStateService } from './productions-state.service';
import { ProductionsMembersService } from './productions-members.service';
import { ProductionsTemplatesService } from './productions-templates.service';

@Injectable()
export class ProductionsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private obsService: ObsService,
    private vmixService: VmixService,
    private auditService: AuditService,
    private stateService: ProductionsStateService,
    private membersService: ProductionsMembersService,
    private templatesService: ProductionsTemplatesService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateProductionDto) {
    let adminRole = await this.prisma.role.findUnique({ where: { name: Role.ADMIN } });

    if (!adminRole) {
      adminRole = await this.prisma.role.findUnique({ where: { name: Role.SUPERADMIN } });
    }

    if (!adminRole) {
      adminRole = await this.prisma.role.create({
        data: { name: Role.ADMIN, description: 'Production Administrator' },
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.tenantId) {
      throw new ConflictException('User does not belong to any tenant');
    }

    return this.prisma.$transaction(async (tx) => {
      const production = await tx.production.create({
        data: {
          name: dto.name,
          description: dto.description,
          status: dto.status || 'DRAFT',
          engineType: dto.engineType || 'OBS',
          users: { create: { userId, roleId: adminRole.id } },
          tenantId: user.tenantId,
        },
      });

      if (dto.initialMembers && dto.initialMembers.length > 0) {
        for (const member of dto.initialMembers) {
          const memberUser = await tx.user.findUnique({ where: { email: member.email } });
          if (!memberUser) continue;

          const role = await tx.role.findUnique({ where: { name: member.roleName } });
          if (!role) continue;

          if (memberUser.id === userId) continue;

          await tx.productionUser.upsert({
            where: { userId_productionId: { userId: memberUser.id, productionId: production.id } },
            create: { userId: memberUser.id, productionId: production.id, roleId: role.id },
            update: { roleId: role.id },
          });
        }
      }

      void this.auditService.log({
        productionId: production.id,
        userId,
        action: 'PRODUCTION_CREATE',
        details: { name: production.name, engine: production.engineType },
      });

      return production;
    });
  }

  async findAllForUser(userId: string, query: GetProductionsQueryDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { globalRole: true },
    });

    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    const isSuperAdmin = user.globalRole?.name === Role.SUPERADMIN;

    const where: Prisma.ProductionWhereInput = {
      deletedAt: null,
      tenantId: user.tenantId,
    };

    if (!isSuperAdmin) {
      where.users = { some: { userId } };
    }
    if (query.status) {
      where.status = query.status as ProductionStatus;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.engineType) {
      where.engineType = query.engineType;
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.production.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              role: { include: { permissions: { include: { permission: true } } } },
            },
          },
        },
      }),
      this.prisma.production.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(productionId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { globalRole: true },
    });

    const isSuperAdmin = user?.globalRole?.name === Role.SUPERADMIN;

    const where: Prisma.ProductionWhereInput = {
      id: productionId,
      deletedAt: null,
      tenantId: user?.tenantId,
    };

    if (!isSuperAdmin) {
      where.users = { some: { userId } };
    }

    const prod = await this.prisma.production.findFirst({
      where,
      include: {
        users: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            role: true,
          },
        },
        obsConnections: true,
        vmixConnection: true,
      },
    });

    if (!prod) throw new NotFoundException('Production not found or access denied');
    return prod;
  }

  async update(productionId: string, dto: UpdateProductionDto, userId?: string) {
    const { obsConfig, vmixConfig, ...basicData } = dto;

    return this.prisma
      .$transaction(async (tx) => {
        const production = await tx.production.update({
          where: { id: productionId },
          data: basicData,
        });

        if (obsConfig) {
          await this.obsService.saveConnection(productionId, obsConfig);
        }
        if (vmixConfig) {
          await this.vmixService.saveConnection(productionId, vmixConfig);
        }

        if (dto.engineType === EngineType.VMIX) {
          await tx.obsConnection.updateMany({ where: { productionId }, data: { isEnabled: false } });
          this.eventEmitter.emit('engine.connection.update', { productionId, type: EngineType.OBS, isEnabled: false });
        }

        if (dto.engineType === EngineType.OBS) {
          await tx.vmixConnection.updateMany({ where: { productionId }, data: { isEnabled: false } });
          this.eventEmitter.emit('engine.connection.update', { productionId, type: EngineType.VMIX, isEnabled: false });
        }

        if (dto.engineType === EngineType.APP) {
          await tx.obsConnection.updateMany({ where: { productionId }, data: { isEnabled: false } });
          await tx.vmixConnection.updateMany({ where: { productionId }, data: { isEnabled: false } });
          this.eventEmitter.emit('engine.connection.update', { productionId, type: EngineType.OBS, isEnabled: false });
          this.eventEmitter.emit('engine.connection.update', { productionId, type: EngineType.VMIX, isEnabled: false });
        }

        return production;
      })
      .then((prod) => {
        this.eventEmitter.emit('production.updated', { productionId });
        void this.auditService.log({
          productionId,
          action: 'PRODUCTION_UPDATE',
          details: { name: prod.name, status: prod.status },
        });
        void this.prisma.productionLog.create({
          data: {
            productionId,
            userId: userId ?? null,
            eventType: 'PRODUCTION_UPDATE',
            details: { name: prod.name, status: prod.status, engineType: prod.engineType },
          },
        });
        return prod;
      });
  }

  async remove(productionId: string) {
    const result = await this.prisma.production.update({
      where: { id: productionId },
      data: { deletedAt: new Date() },
    });

    void this.auditService.log({
      productionId,
      action: 'PRODUCTION_DELETE',
      details: { name: result.name },
    });

    return result;
  }

  async getHistory(productionId: string, query: PaginationQueryDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.productionLog.findMany({
        where: { productionId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.productionLog.count({ where: { productionId } }),
    ]);

    return { data, meta: { total, page, limit, lastPage: Math.ceil(total / limit) } };
  }

  // ─── Delegated — State ────────────────────────────────────────────────────

  updateState(productionId: string, dto: UpdateProductionStateDto) {
    return this.stateService.updateState(productionId, dto);
  }

  toggleRehearsal(productionId: string, enabled: boolean) {
    return this.stateService.toggleRehearsal(productionId, enabled);
  }

  // ─── Delegated — Members ──────────────────────────────────────────────────

  assignUser(productionId: string, dto: AssignUserDto) {
    return this.membersService.assignUser(productionId, dto);
  }

  updateUserRole(productionId: string, userId: string, roleName: string) {
    return this.membersService.updateUserRole(productionId, userId, roleName);
  }

  removeUser(productionId: string, userIdToRemove: string) {
    return this.membersService.removeUser(productionId, userIdToRemove);
  }

  // ─── Delegated — Templates ────────────────────────────────────────────────

  cloneProduction(productionId: string, userId: string, dto: CloneProductionDto) {
    return this.templatesService.cloneProduction(productionId, userId, dto);
  }

  saveAsTemplate(productionId: string, userId: string, dto: SaveAsTemplateDto) {
    return this.templatesService.saveAsTemplate(productionId, userId, dto);
  }

  listTemplates(userId: string) {
    return this.templatesService.listTemplates(userId);
  }

  createFromTemplate(templateId: string, userId: string, dto: CreateFromTemplateDto) {
    return this.templatesService.createFromTemplate(templateId, userId, dto);
  }
}
