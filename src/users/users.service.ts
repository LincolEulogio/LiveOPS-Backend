import { Injectable, NotFoundException, ConflictException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, CreateRoleDto, UpdateRoleDto } from './dto/users.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService implements OnModuleInit {
    private readonly logger = new Logger(UsersService.name);

    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        await this.seedDefaultRoles();
    }

    private async seedDefaultRoles() {
        // Seed Permissions first
        const permissions = [
            { action: 'production:create', description: 'Create new productions' },
            { action: 'production:manage', description: 'Full control over a production' },
            { action: 'user:manage', description: 'Manage global users' },
            { action: 'role:manage', description: 'Manage roles and permissions' },
        ];

        for (const p of permissions) {
            await this.prisma.permission.upsert({
                where: { action: p.action },
                update: {},
                create: p
            });
        }

        const defaultRoles = [
            { name: 'ADMIN', description: 'Full access to production' },
            { name: 'OPERATOR', description: 'Can operate engines and execute commands' },
            { name: 'VIEWER', description: 'Read-only access to production status' }
        ];

        for (const roleData of defaultRoles) {
            const exists = await this.prisma.role.findUnique({ where: { name: roleData.name } });
            if (!exists) {
                const role = await this.prisma.role.create({ data: roleData });
                this.logger.log(`Created default role: ${roleData.name}`);

                // Auto-assign all permissions to ADMIN for convenience in development
                if (roleData.name === 'ADMIN') {
                    const allPerms = await this.prisma.permission.findMany();
                    await this.prisma.rolePermission.createMany({
                        data: allPerms.map(p => ({ roleId: role.id, permissionId: p.id }))
                    });
                }
            }
        }
    }

    async updateRolePermissions(roleId: string, permissionIds: string[]) {
        return this.prisma.$transaction(async (tx) => {
            // Remove existing
            await tx.rolePermission.deleteMany({ where: { roleId } });
            // Add new
            if (permissionIds.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissionIds.map(pid => ({ roleId, permissionId: pid }))
                });
            }
            return tx.role.findUnique({
                where: { id: roleId },
                include: { permissions: { include: { permission: true } } }
            });
        });
    }

    // --- Users CRUD ---
    async findAllUsers() {
        return this.prisma.user.findMany({
            where: { deletedAt: null },
            select: { id: true, email: true, name: true, createdAt: true, updatedAt: true }
        });
    }

    async createUser(dto: CreateUserDto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) throw new ConflictException('Email already exists');

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        return this.prisma.user.create({
            data: {
                email: dto.email,
                name: dto.name,
                password: hashedPassword
            },
            select: { id: true, email: true, name: true, createdAt: true }
        });
    }

    async updateUser(id: string, dto: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user || user.deletedAt) throw new NotFoundException('User not found');

        const data: any = { ...dto };
        if (dto.password) {
            data.password = await bcrypt.hash(dto.password, 10);
        }

        return this.prisma.user.update({
            where: { id },
            data,
            select: { id: true, email: true, name: true, updatedAt: true }
        });
    }

    async deleteUser(id: string) {
        return this.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date() },
            select: { id: true, email: true }
        });
    }

    // --- Roles CRUD ---
    async findAllRoles() {
        return this.prisma.role.findMany({
            include: { permissions: { include: { permission: true } } }
        });
    }

    async createRole(dto: CreateRoleDto) {
        const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
        if (existing) throw new ConflictException('Role already exists');

        return this.prisma.role.create({
            data: {
                name: dto.name,
                description: dto.description
            }
        });
    }

    async updateRole(id: string, dto: UpdateRoleDto) {
        const role = await this.prisma.role.findUnique({ where: { id } });
        if (!role) throw new NotFoundException('Role not found');
        return this.prisma.role.update({
            where: { id },
            data: dto
        });
    }

    async deleteRole(id: string) {
        return this.prisma.role.delete({ where: { id } });
    }

    // --- Permissions ---
    async findAllPermissions() {
        return this.prisma.permission.findMany();
    }
}
