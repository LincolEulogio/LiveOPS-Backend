import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    try {
      // 1. Check Global Permissions
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.userId },
        include: {
          globalRole: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      });

      if (!dbUser) {
        throw new ForbiddenException('User record not found');
      }

      const globalRoleName = dbUser.globalRole?.name?.toUpperCase();
      if (globalRoleName === 'SUPERADMIN' || globalRoleName === 'ADMIN') {
        return true;
      }

      const globalPermissions =
        dbUser.globalRole?.permissions
          ?.filter((rp) => rp.permission)
          .map((rp) => rp.permission.action) || [];

      const hasGlobalPermission = requiredPermissions.every((perm) =>
        globalPermissions.includes(perm),
      );

      if (hasGlobalPermission) {
        return true;
      }

      // 2. Check Production-Specific Permissions
      const productionId =
        request.params.productionId ||
        request.params.id ||
        request.body.productionId;

      // Robust UUID validation
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
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        });

        if (productionUser) {
          const prodRoleName = productionUser.role.name.toUpperCase();
          if (
            prodRoleName === 'SUPERADMIN' ||
            prodRoleName === 'ADMIN'
          ) {
            return true;
          }

          const productionPermissions = productionUser.role.permissions
            .filter((rp) => rp.permission)
            .map((rp) => rp.permission.action);

          // Implicit baseline permissions for ANY user explicitly added to the production
          // This prevents 403 errors on non-sensitive endpoints for any assigned user
          const implicitPermissions = [
            'production:view',
            'rundown:view',
            'script:view',
            'intercom:view',
            'analytics:view',
            'social:view',
            // Non-sensitive READ-only endpoints granted to all assigned users:
            'automation:view',
            'media:view',
            'streaming:view',
          ];

          const allPermissions = [
            ...productionPermissions,
            ...implicitPermissions,
          ];

          const hasProdPermission = requiredPermissions.every((perm) =>
            allPermissions.includes(perm),
          );
          if (hasProdPermission) {
            return true;
          }
        }
      }

      throw new ForbiddenException('Insufficient permissions');
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      console.error('[PermissionsGuard] Error:', error.message || error);
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
