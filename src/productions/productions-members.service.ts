import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/common/services/audit.service';
import { AssignUserDto } from './dto/production.dto';

@Injectable()
export class ProductionsMembersService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

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

    const existing = await this.prisma.productionUser.findUnique({
      where: { userId_productionId: { userId: userToAssign.id, productionId } },
    });
    if (existing)
      throw new ConflictException('User is already in this production');

    const result = await this.prisma.productionUser.create({
      data: { userId: userToAssign.id, productionId, roleId: roleToAssign.id },
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
      where: { userId_productionId: { userId, productionId } },
      data: { roleId: role.id },
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
      where: { userId_productionId: { userId: userIdToRemove, productionId } },
    });

    this.eventEmitter.emit('production.user.removed', {
      productionId,
      userId: userIdToRemove,
    });

    void this.auditService.log({
      productionId,
      action: 'PRODUCTION_MEMBER_REMOVE',
      details: { userId: userIdToRemove },
    });

    return result;
  }
}
