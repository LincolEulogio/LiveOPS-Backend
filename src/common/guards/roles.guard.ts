import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../constants/roles.enum';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // 1. Check Global Role
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { globalRole: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('User record not found');
    }

    const globalRoleName = dbUser.globalRole?.name as Role;
    
    // Superadmin bypasses everything, Admin bypasses most global checks
    if (globalRoleName === Role.SUPERADMIN) return true;
    
    if (requiredRoles.includes(globalRoleName)) {
      return true;
    }

    // 2. Check Production-Specific Role if applicable
    const productionId =
      request.params.productionId ||
      request.params.id ||
      request.body.productionId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      productionId &&
      typeof productionId === 'string' &&
      uuidRegex.test(productionId)
    ) {
      const productionUser = await this.prisma.productionUser.findUnique({
        where: {
          userId_productionId: {
            userId: user.userId,
            productionId: productionId,
          },
        },
        include: { role: true },
      });

      if (productionUser) {
        const prodRoleName = productionUser.role.name as Role;
        if (prodRoleName === Role.SUPERADMIN || prodRoleName === Role.ADMIN) {
          return true;
        }
        if (requiredRoles.includes(prodRoleName)) {
          return true;
        }
      }
    }

    throw new ForbiddenException('Insufficient role privileges');
  }
}
