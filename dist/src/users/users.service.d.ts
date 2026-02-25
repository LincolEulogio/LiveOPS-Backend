import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, CreateRoleDto, UpdateRoleDto } from '@/users/dto/users.dto';
export declare class UsersService implements OnModuleInit {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    private bootstrapAdmin;
    seedDefaultRoles(): Promise<void>;
    updateRolePermissions(roleId: string, permissionIds: string[]): Promise<({
        permissions: ({
            permission: {
                id: string;
                action: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }) | null>;
    findAllUsers(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        email: string;
        globalRoleId: string | null;
        globalRole: {
            name: string;
        } | null;
    }[]>;
    createUser(dto: CreateUserDto): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        email: string;
        globalRoleId: string | null;
        globalRole: {
            name: string;
        } | null;
    }>;
    updateUser(id: string, dto: UpdateUserDto): Promise<{
        id: string;
        updatedAt: Date;
        name: string | null;
        email: string;
        globalRoleId: string | null;
        globalRole: {
            name: string;
        } | null;
    }>;
    deleteUser(id: string): Promise<{
        id: string;
        email: string;
    }>;
    findAllRoles(): Promise<({
        permissions: ({
            permission: {
                id: string;
                action: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    })[]>;
    createRole(dto: CreateRoleDto): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    updateRole(id: string, dto: UpdateRoleDto): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    deleteRole(id: string): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    findAllPermissions(): Promise<{
        id: string;
        action: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
}
