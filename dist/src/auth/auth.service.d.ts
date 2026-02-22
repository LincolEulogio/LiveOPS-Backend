import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        name: string | null;
        createdAt: Date;
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
        email: string;
        name: string | null;
        createdAt: Date;
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
            email: string;
            name: string | null;
            createdAt: Date;
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
            email: string;
            name: string | null;
            createdAt: Date;
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
    private generateTokens;
}
