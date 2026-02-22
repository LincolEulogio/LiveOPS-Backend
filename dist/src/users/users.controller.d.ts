import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, CreateRoleDto, UpdateRoleDto } from './dto/users.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    })[]>;
    createRole(dto: CreateRoleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    updateRole(id: string, dto: UpdateRoleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
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
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }) | null>;
    deleteRole(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
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
