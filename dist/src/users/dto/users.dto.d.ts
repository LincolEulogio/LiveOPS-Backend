export declare class CreateUserDto {
    email: string;
    name: string;
    password: string;
    globalRoleId?: string;
}
export declare class UpdateUserDto {
    name?: string;
    password?: string;
    globalRoleId?: string;
}
export declare class CreateRoleDto {
    name: string;
    description?: string;
}
export declare class UpdateRoleDto {
    name?: string;
    description?: string;
}
