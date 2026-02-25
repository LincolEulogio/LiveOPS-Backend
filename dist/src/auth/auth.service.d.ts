import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterUserDto } from '@/auth/dto/register-user.dto';
import { LoginUserDto } from '@/auth/dto/login-user.dto';
import { UsersService } from '@/users/users.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    private usersService;
    constructor(prisma: PrismaService, jwtService: JwtService, usersService: UsersService);
    getProfile(userId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        email: string;
        globalRole: {
            id: string;
            name: string;
            permissions: {
                permission: {
                    action: string;
                };
            }[];
        } | null;
    } | null>;
    updateProfile(userId: string, data: {
        name?: string;
        password?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        email: string;
        globalRole: {
            id: string;
            name: string;
            permissions: {
                permission: {
                    action: string;
                };
            }[];
        } | null;
    }>;
    register(dto: RegisterUserDto): Promise<{
        accessToken: string;
        refreshToken: `${string}-${string}-${string}-${string}-${string}`;
        user: {
            id: string;
            createdAt: Date;
            name: string | null;
            email: string;
            globalRole: {
                id: string;
                name: string;
                permissions: {
                    permission: {
                        action: string;
                    };
                }[];
            } | null;
        } | null;
    }>;
    login(dto: LoginUserDto, ipAddress?: string): Promise<{
        accessToken: string;
        refreshToken: `${string}-${string}-${string}-${string}-${string}`;
        user: {
            id: string;
            createdAt: Date;
            name: string | null;
            email: string;
            globalRole: {
                id: string;
                name: string;
                permissions: {
                    permission: {
                        action: string;
                    };
                }[];
            } | null;
        } | null;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    logout(refreshToken: string): Promise<{
        success: boolean;
    }>;
    checkSetup(): Promise<{
        setupRequired: boolean;
    }>;
    private generateTokens;
}
