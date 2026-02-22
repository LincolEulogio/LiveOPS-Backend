"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = UsersService_1 = class UsersService {
    prisma;
    logger = new common_1.Logger(UsersService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        await this.seedDefaultRoles();
        await this.bootstrapAdmin();
    }
    async bootstrapAdmin() {
        const adminRole = await this.prisma.role.findUnique({
            where: { name: 'ADMIN' },
        });
        if (!adminRole)
            return;
        const adminUser = await this.prisma.user.findUnique({
            where: { email: 'admin@liveops.com' },
        });
        if (adminUser && adminUser.globalRoleId !== adminRole.id) {
            await this.prisma.user.update({
                where: { id: adminUser.id },
                data: { globalRoleId: adminRole.id },
            });
            this.logger.log('Force-bootstrapped admin@liveops.com as Global ADMIN');
        }
    }
    async seedDefaultRoles() {
        const permissions = [
            { action: 'production:create', description: 'Create new productions' },
            {
                action: 'production:manage',
                description: 'Full control over a production',
            },
            { action: 'user:manage', description: 'Manage global users' },
            { action: 'role:manage', description: 'Manage roles and permissions' },
        ];
        for (const p of permissions) {
            await this.prisma.permission.upsert({
                where: { action: p.action },
                update: {},
                create: p,
            });
        }
        const defaultRoles = [
            { name: 'SUPERADMIN', description: 'Global System Administrator' },
        ];
        for (const roleData of defaultRoles) {
            let role = await this.prisma.role.findUnique({
                where: { name: roleData.name },
            });
            if (!role) {
                role = await this.prisma.role.create({ data: roleData });
                this.logger.log(`Created default role: ${roleData.name}`);
            }
            const allPerms = await this.prisma.permission.findMany();
            if (role.name === 'SUPERADMIN') {
                for (const p of allPerms) {
                    await this.prisma.rolePermission.upsert({
                        where: {
                            roleId_permissionId: { roleId: role.id, permissionId: p.id },
                        },
                        create: { roleId: role.id, permissionId: p.id },
                        update: {},
                    });
                }
            }
        }
    }
    async updateRolePermissions(roleId, permissionIds) {
        return this.prisma.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({ where: { roleId } });
            if (permissionIds.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissionIds.map((pid) => ({ roleId, permissionId: pid })),
                });
            }
            return tx.role.findUnique({
                where: { id: roleId },
                include: { permissions: { include: { permission: true } } },
            });
        });
    }
    async findAllUsers() {
        return this.prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true,
                globalRoleId: true,
                globalRole: {
                    select: { name: true },
                },
            },
        });
    }
    async createUser(dto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing)
            throw new common_1.ConflictException('Email already exists');
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        return this.prisma.user.create({
            data: {
                email: dto.email,
                name: dto.name,
                password: hashedPassword,
                globalRoleId: dto.globalRoleId || null,
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                globalRoleId: true,
                globalRole: { select: { name: true } },
            },
        });
    }
    async updateUser(id, dto) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user || user.deletedAt)
            throw new common_1.NotFoundException('User not found');
        const data = { ...dto };
        if (dto.password) {
            data.password = await bcrypt.hash(dto.password, 10);
        }
        if (data.globalRoleId === '') {
            data.globalRoleId = null;
        }
        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                updatedAt: true,
                globalRoleId: true,
                globalRole: { select: { name: true } },
            },
        });
    }
    async deleteUser(id) {
        return this.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date() },
            select: { id: true, email: true },
        });
    }
    async findAllRoles() {
        return this.prisma.role.findMany({
            include: { permissions: { include: { permission: true } } },
        });
    }
    async createRole(dto) {
        const existing = await this.prisma.role.findUnique({
            where: { name: dto.name },
        });
        if (existing)
            throw new common_1.ConflictException('Role already exists');
        return this.prisma.role.create({
            data: {
                name: dto.name,
                description: dto.description,
            },
        });
    }
    async updateRole(id, dto) {
        const role = await this.prisma.role.findUnique({ where: { id } });
        if (!role)
            throw new common_1.NotFoundException('Role not found');
        return this.prisma.role.update({
            where: { id },
            data: dto,
        });
    }
    async deleteRole(id) {
        const role = await this.prisma.role.findUnique({ where: { id } });
        if (role?.name === 'SUPERADMIN') {
            throw new common_1.ConflictException('The SUPERADMIN role is protected and cannot be deleted.');
        }
        return this.prisma.role.delete({ where: { id } });
    }
    async findAllPermissions() {
        return this.prisma.permission.findMany();
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map