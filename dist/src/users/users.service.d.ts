import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, CreateRoleDto, UpdateRoleDto } from './dto/users.dto';
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
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                action: string;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }) | null>;
    findAllUsers(): Promise<{
        id: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        globalRoleId: string | null;
        globalRole: {
            name: string;
        } | null;
    }[]>;
    createUser(dto: CreateUserDto): Promise<{
        id: string;
        name: string | null;
        createdAt: Date;
        email: string;
        globalRoleId: string | null;
        globalRole: {
            name: string;
        } | null;
    }>;
    updateUser(id: string, dto: UpdateUserDto): Promise<{
        id: string;
        name: string | null;
        updatedAt: Date;
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
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                action: string;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    })[]>;
    createRole(dto: CreateRoleDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    updateRole(id: string, dto: UpdateRoleDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    deleteRole(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    findAllPermissions(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        action: string;
    }[]>;
}
