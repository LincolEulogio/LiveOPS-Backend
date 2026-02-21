import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async getProfile(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId, deletedAt: null },
            select: { id: true, email: true, name: true, globalRole: { select: { id: true, name: true } } }
        });
    }

    async register(dto: RegisterUserDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email }
        });
        if (existing) {
            throw new ConflictException('Email already in use');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
            }
        });

        const tokens = await this.generateTokens(user.id);
        const fullUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, email: true, name: true, globalRole: { select: { id: true, name: true } } }
        });
        return { user: fullUser, ...tokens };
    }

    async login(dto: LoginUserDto, ipAddress?: string) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email }
        });

        if (!user || user.deletedAt) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Attempt to log audit event
        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'login',
                ipAddress,
            }
        }).catch((e: any) => console.error('Failed to write audit log', e));

        const tokens = await this.generateTokens(user.id);
        const fullUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, email: true, name: true, globalRole: { select: { id: true, name: true } } }
        });
        return { user: fullUser, ...tokens };
    }

    async refresh(refreshToken: string) {
        const session = await this.prisma.session.findUnique({
            where: { refreshToken }
        });

        if (!session || session.isRevoked || session.expiresAt < new Date()) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const tokens = await this.generateTokens(session.userId);

        // Revoke old session
        await this.prisma.session.update({
            where: { id: session.id },
            data: { isRevoked: true }
        });

        return tokens;
    }

    async logout(refreshToken: string) {
        await this.prisma.session.updateMany({
            where: { refreshToken },
            data: { isRevoked: true }
        });
        return { success: true };
    }

    private async generateTokens(userId: string) {
        const payload = { sub: userId };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

        const refreshToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await this.prisma.session.create({
            data: {
                userId,
                refreshToken,
                expiresAt,
            }
        });

        return {
            accessToken,
            refreshToken
        };
    }
}
