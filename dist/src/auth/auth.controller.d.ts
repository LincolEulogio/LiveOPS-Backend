import { AuthService } from '@/auth/auth.service';
import { RegisterUserDto } from '@/auth/dto/register-user.dto';
import { LoginUserDto } from '@/auth/dto/login-user.dto';
import type { Request } from 'express';
interface RequestWithUser extends Request {
    user: {
        userId: string;
        tenantId: string;
    };
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    checkSetup(): Promise<{
        setupRequired: boolean;
    }>;
    getProfile(req: RequestWithUser): Promise<{
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
    updateProfile(req: RequestWithUser, data: {
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
    login(dto: LoginUserDto, req: Request): Promise<{
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
}
export {};
