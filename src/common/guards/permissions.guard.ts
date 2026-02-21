import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true; // No permissions required
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        // 1. Check Global Permissions
        const dbUser = await this.prisma.user.findUnique({
            where: { id: user.userId },
            include: {
                globalRole: {
                    include: {
                        permissions: { include: { permission: true } }
                    }
                }
            }
        });

        if (!dbUser) {
            throw new ForbiddenException('User record not found');
        }

        const globalPermissions = dbUser.globalRole?.permissions.map(rp => rp.permission.action) || [];
        const hasGlobalPermission = requiredPermissions.every(perm => globalPermissions.includes(perm));

        if (hasGlobalPermission) {
            return true;
        }

        // 2. Check Production-Specific Permissions
        const productionId = request.params.productionId || request.params.id || request.body.productionId;

        if (productionId && typeof productionId === 'string' && productionId.length > 20) { // Simple UUID check
            const productionUser = await this.prisma.productionUser.findUnique({
                where: {
                    userId_productionId: {
                        userId: user.userId,
                        productionId: productionId
                    }
                },
                include: {
                    role: {
                        include: {
                            permissions: { include: { permission: true } }
                        }
                    }
                }
            });

            if (productionUser) {
                const productionPermissions = productionUser.role.permissions.map(rp => rp.permission.action);
                const hasProdPermission = requiredPermissions.every(perm => productionPermissions.includes(perm));
                if (hasProdPermission) {
                    return true;
                }
            }
        }

        throw new ForbiddenException('Insufficient permissions');

        return true;
    }
}
