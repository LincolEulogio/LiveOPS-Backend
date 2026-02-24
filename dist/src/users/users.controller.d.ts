import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, CreateRoleDto, UpdateRoleDto } from './dto/users.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAllUsers(): Promise<{
        name: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        globalRoleId: string | null;
        globalRole: {
            name: string;
        } | null;
    }[]>;
    createUser(dto: CreateUserDto): Promise<{
        name: string | null;
        id: string;
        createdAt: Date;
        email: string;
        globalRoleId: string | null;
        globalRole: {
            name: string;
        } | null;
    }>;
    updateUser(id: string, dto: UpdateUserDto): Promise<{
        name: string | null;
        id: string;
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
                action: string;
                id: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
    } & {
        name: string;
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    createRole(dto: CreateRoleDto): Promise<{
        name: string;
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRole(id: string, dto: UpdateRoleDto): Promise<{
        name: string;
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRolePermissions(id: string, data: {
        permissionIds: string[];
    }): Promise<({
        permissions: ({
            permission: {
                action: string;
                id: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
    } & {
        name: string;
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    deleteRole(id: string): Promise<{
        name: string;
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAllPermissions(): Promise<{
        action: string;
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
}
