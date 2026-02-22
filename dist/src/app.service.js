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
var AppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma/prisma.service");
const rbac_constants_1 = require("./common/constants/rbac.constants");
let AppService = AppService_1 = class AppService {
    prisma;
    logger = new common_1.Logger(AppService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
    }
    getHello() {
        return 'Hello World!';
    }
    async seedRbac() {
        this.logger.log('Checking RBAC synchronization...');
        try {
            const permissionActions = Object.values(rbac_constants_1.PermissionAction);
            for (const action of permissionActions) {
                await this.prisma.permission.upsert({
                    where: { action },
                    update: {},
                    create: { action, description: `Permission for ${action}` },
                });
            }
            for (const [roleKey, roleData] of Object.entries(rbac_constants_1.StandardRoles)) {
                const role = await this.prisma.role.upsert({
                    where: { name: roleData.name },
                    update: { description: roleData.description },
                    create: {
                        name: roleData.name,
                        description: roleData.description
                    },
                });
                const permissions = await this.prisma.permission.findMany({
                    where: { action: { in: roleData.permissions } },
                });
                for (const p of permissions) {
                    await this.prisma.rolePermission.upsert({
                        where: {
                            roleId_permissionId: {
                                roleId: role.id,
                                permissionId: p.id
                            }
                        },
                        update: {},
                        create: {
                            roleId: role.id,
                            permissionId: p.id
                        }
                    });
                }
            }
            this.logger.log('RBAC synchronization complete.');
        }
        catch (error) {
            this.logger.error('Failed to sync RBAC:', error);
        }
    }
};
exports.AppService = AppService;
exports.AppService = AppService = AppService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppService);
//# sourceMappingURL=app.service.js.map