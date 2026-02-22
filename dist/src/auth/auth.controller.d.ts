import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterUserDto): Promise<{
        accessToken: string;
        refreshToken: `${string}-${string}-${string}-${string}-${string}`;
        user: {
            name: string | null;
            id: string;
            createdAt: Date;
            email: string;
            globalRole: {
                name: string;
                id: string;
                permissions: {
                    permission: {
                        action: string;
                    };
                }[];
            } | null;
        } | null;
    }>;
    getProfile(req: any): Promise<{
        name: string | null;
        id: string;
        createdAt: Date;
        email: string;
        globalRole: {
            name: string;
            id: string;
            permissions: {
                permission: {
                    action: string;
                };
            }[];
        } | null;
    } | null>;
    updateProfile(req: any, data: {
        name?: string;
        password?: string;
    }): Promise<{
        name: string | null;
        id: string;
        createdAt: Date;
        email: string;
        globalRole: {
            name: string;
            id: string;
            permissions: {
                permission: {
                    action: string;
                };
            }[];
        } | null;
    }>;
    login(dto: LoginUserDto, req: any): Promise<{
        accessToken: string;
        refreshToken: `${string}-${string}-${string}-${string}-${string}`;
        user: {
            name: string | null;
            id: string;
            createdAt: Date;
            email: string;
            globalRole: {
                name: string;
                id: string;
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
