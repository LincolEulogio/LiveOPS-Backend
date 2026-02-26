import { UsersService } from '@/users/users.service';
import { CreateUserDto, UpdateUserDto, CreateRoleDto, UpdateRoleDto } from '@/users/dto/users.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAllUsers(): Promise<{
        id: string;
        email: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
        globalRoleId: string | null;
        globalRole: {
            name: string;
        } | null;
    }[]>;
    createUser(dto: CreateUserDto): Promise<{
        id: string;
        email: string;
        name: string | null;
        createdAt: Date;
        globalRoleId: string | null;
        globalRole: {
            name: string;
        } | null;
    }>;
    updateUser(id: string, dto: UpdateUserDto): Promise<{
        id: string;
        email: string;
        name: string | null;
        updatedAt: Date;
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
    updateRolePermissions(id: string, data: {
        permissionIds: string[];
    }): Promise<({
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
