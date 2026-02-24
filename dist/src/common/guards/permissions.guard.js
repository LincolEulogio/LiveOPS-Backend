"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const permissions_decorator_1 = require("../decorators/permissions.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
let PermissionsGuard = class PermissionsGuard {
    reflector;
    prisma;
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const requiredPermissions = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('User not authenticated');
        }
        try {
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
                throw new common_1.ForbiddenException('User record not found');
            }
            const globalRoleName = dbUser.globalRole?.name?.toUpperCase();
            if (globalRoleName === 'SUPERADMIN' || globalRoleName === 'ADMIN') {
                return true;
            }
            const globalPermissions = dbUser.globalRole?.permissions
                .filter((rp) => rp.permission)
                .map((rp) => rp.permission.action) || [];
            const hasGlobalPermission = requiredPermissions.every((perm) => globalPermissions.includes(perm));
            if (hasGlobalPermission) {
                return true;
            }
            const productionId = request.params.productionId ||
                request.params.id ||
                request.body.productionId;
            if (productionId &&
                typeof productionId === 'string' &&
                productionId.length > 20) {
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
                    if (productionUser.role.name === 'SUPERADMIN' ||
                        productionUser.role.name === 'ADMIN') {
                        return true;
                    }
                    const productionPermissions = productionUser.role.permissions
                        .filter((rp) => rp.permission)
                        .map((rp) => rp.permission.action);
                    const implicitPermissions = [
                        'production:view',
                        'rundown:view',
                        'script:view',
                        'intercom:view',
                        'analytics:view',
                    ];
                    const allPermissions = [
                        ...productionPermissions,
                        ...implicitPermissions,
                    ];
                    const hasProdPermission = requiredPermissions.every((perm) => allPermissions.includes(perm));
                    if (hasProdPermission) {
                        return true;
                    }
                }
            }
            throw new common_1.ForbiddenException('Insufficient permissions');
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException)
                throw error;
            console.error('[PermissionsGuard] Crash detected:', error);
            throw new common_1.ForbiddenException('Authorization system failure');
        }
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map