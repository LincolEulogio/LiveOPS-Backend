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
        const user = request.user; // Set by JwtAuthGuard

        // Also get productionId from params or body if we're operating in a production context
        const productionId = request.params.productionId || request.body.productionId;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        if (!productionId) {
            // For global permissions, we could check global roles here.
            // For simplicity, let's assume all ops are production-scoped if they have a permission check
            // OR let admins bypass.
            // This is a placeholder for global admin checks.
            return true;
        }

        // Check user's role in this specific production
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
                        permissions: {
                            include: { permission: true }
                        }
                    }
                }
            }
        });

        if (!productionUser) {
            throw new ForbiddenException('User is not part of this production');
        }

        const userPermissions = productionUser.role.permissions.map((rp: any) => rp.permission.action);
        const hasPermission = requiredPermissions.every(perm => userPermissions.includes(perm));

        if (!hasPermission) {
            throw new ForbiddenException('Insufficient permissions');
        }

        return true;
    }
}
