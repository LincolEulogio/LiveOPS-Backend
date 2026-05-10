import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateProductionDto,
  UpdateProductionDto,
  UpdateProductionStateDto,
  AssignUserDto,
  EngineType,
  GetProductionsQueryDto,
} from '@/productions/dto/production.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ObsService } from '@/obs/obs.service';
import { VmixService } from '@/vmix/vmix.service';
import { Prisma, ProductionStatus } from '@prisma/client';
import { Role } from '@/common/constants/roles.enum';
import { AuditService } from '@/common/services/audit.service';

@Injectable()
export class ProductionsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private obsService: ObsService,
    private vmixService: VmixService,
    private auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateProductionDto) {
    // We assume the creator gets an 'ADMIN' role in this production
    // First, find or ensure the 'ADMIN' role exists
    let adminRole = await this.prisma.role.findUnique({
      where: { name: Role.ADMIN },
    });

    if (!adminRole) {
      // Fallback to SUPERADMIN if ADMIN is not found for some reason
      adminRole = await this.prisma.role.findUnique({
        where: { name: Role.SUPERADMIN },
      });
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
          users: {
            create: {
              userId,
              roleId: adminRole.id,
            },
          },
          tenantId: user.tenantId,
        },
      });

      // Handle initial members if provided
      if (dto.initialMembers && dto.initialMembers.length > 0) {
        for (const member of dto.initialMembers) {
          const user = await tx.user.findUnique({
            where: { email: member.email },
          });
          if (!user) continue; // Or throw error? Logic usually skips if not found or allows creation if we had invite logic

          const role = await tx.role.findUnique({
            where: { name: member.roleName },
          });
          if (!role) continue;

          // Skip if creator (handled above)
          if (user.id === userId) continue;

          await tx.productionUser.upsert({
            where: {
              userId_productionId: {
                userId: user.id,
                productionId: production.id,
              },
            },
            create: {
              userId: user.id,
              productionId: production.id,
              roleId: role.id,
            },
            update: {
              roleId: role.id,
            },
          });
        }
      }

      const result = production;

      // Audit Log
      void this.auditService.log({
        productionId: result.id,
        userId,
        action: 'PRODUCTION_CREATE',
        details: { name: result.name, engine: result.engineType },
      });

      return result;
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

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const isSuperAdmin = user.globalRole?.name === Role.SUPERADMIN;

    const where: Prisma.ProductionWhereInput = {
      deletedAt: null,
      tenantId: user.tenantId,
    };

    // Only filter by user assignment if NOT a SUPERADMIN
    if (!isSuperAdmin) {
      where.users = {
        some: { userId },
      };
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
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.production.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
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
        obsConnection: true,
        vmixConnection: true,
      },
    });

    if (!prod)
      throw new NotFoundException('Production not found or access denied');
    return prod;
  }

  async update(productionId: string, dto: UpdateProductionDto) {
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

        // Keep a single active engine connection to avoid cross-engine flapping in realtime UI
        if (dto.engineType === EngineType.VMIX) {
          await tx.obsConnection.updateMany({
            where: { productionId },
            data: { isEnabled: false },
          });
          // Also stop the actual connection in the manager via service if it was active
          this.eventEmitter.emit('engine.connection.update', {
            productionId,
            type: EngineType.OBS,
            isEnabled: false,
          });
        }

        if (dto.engineType === EngineType.OBS) {
          await tx.vmixConnection.updateMany({
            where: { productionId },
            data: { isEnabled: false },
          });
          this.eventEmitter.emit('engine.connection.update', {
            productionId,
            type: EngineType.VMIX,
            isEnabled: false,
          });
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
        // Audit Log
        void this.auditService.log({
          productionId,
          action: 'PRODUCTION_UPDATE',
          details: { name: prod.name, status: prod.status },
        });

        return prod;
      });
  }

  async updateState(productionId: string, dto: UpdateProductionStateDto) {
    const updated = await this.prisma.production.update({
      where: { id: productionId },
      data: { status: dto.status },
    });
    this.eventEmitter.emit('production.updated', { productionId });

    // Audit Log
    void this.auditService.log({
      productionId,
      action: 'PRODUCTION_STATE_CHANGE',
      details: { status: updated.status },
    });

    return updated;
  }

  async assignUser(productionId: string, dto: AssignUserDto) {
    const userToAssign = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!userToAssign)
      throw new NotFoundException('User with this email not found');

    const roleToAssign = await this.prisma.role.findUnique({
      where: { name: dto.roleName },
    });
    if (!roleToAssign) throw new NotFoundException('Role not found');

    // Check if already assigned
    const existing = await this.prisma.productionUser.findUnique({
      where: {
        userId_productionId: {
          userId: userToAssign.id,
          productionId,
        },
      },
    });

    if (existing)
      throw new ConflictException('User is already in this production');

    const result = await this.prisma.productionUser.create({
      data: {
        userId: userToAssign.id,
        productionId,
        roleId: roleToAssign.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: true,
      },
    });

    this.eventEmitter.emit('production.user.assigned', {
      productionId,
      userId: userToAssign.id,
      userEmail: userToAssign.email,
      roleName: roleToAssign.name,
    });

    return result;
  }

  async updateUserRole(productionId: string, userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) throw new NotFoundException('Role not found');

    const result = await this.prisma.productionUser.update({
      where: {
        userId_productionId: {
          userId,
          productionId,
        },
      },
      data: {
        roleId: role.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: true,
      },
    });

    this.eventEmitter.emit('production.user.role.updated', {
      productionId,
      userId,
      roleName,
    });

    return result;
  }

  async removeUser(productionId: string, userIdToRemove: string) {
    const result = await this.prisma.productionUser.delete({
      where: {
        userId_productionId: {
          userId: userIdToRemove,
          productionId,
        },
      },
    });

    this.eventEmitter.emit('production.user.removed', {
      productionId,
      userId: userIdToRemove,
    });

    // Audit Log
    void this.auditService.log({
      productionId,
      action: 'PRODUCTION_MEMBER_REMOVE',
      details: { userId: userIdToRemove },
    });

    return result;
  }

  async remove(productionId: string) {
    const result = await this.prisma.production.update({
      where: { id: productionId },
      data: { deletedAt: new Date() },
    });

    // Audit Log
    void this.auditService.log({
      productionId,
      action: 'PRODUCTION_DELETE',
      details: { name: result.name },
    });

    return result;
  }

  async toggleRehearsal(productionId: string, enabled: boolean) {
    return this.prisma.production.update({
      where: { id: productionId },
      data: { isRehearsal: enabled },
    });
  }
}
