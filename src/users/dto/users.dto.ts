import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @IsOptional()
    globalRoleId?: string;
}

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @MinLength(6)
    @IsOptional()
    password?: string;

    @IsString()
    @IsOptional()
    globalRoleId?: string;
}

export class CreateRoleDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateRoleDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;
}
