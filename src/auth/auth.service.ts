import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from '@/auth/dto/register-user.dto';
import { LoginUserDto } from '@/auth/dto/login-user.dto';
import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

import { UsersService } from '@/users/users.service';
import { MailerService } from '@/common/services/mailer.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private mailerService: MailerService,
  ) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        globalRole: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: { permission: { select: { action: true } } },
            },
          },
        },
      },
    });
  }

  async updateProfile(
    userId: string,
    data: { name?: string; password?: string },
  ) {
    const updateData: Prisma.UserUpdateInput = {};
    if (data.name) updateData.name = data.name;
    if (data.password)
      updateData.password = await bcrypt.hash(data.password, 10);

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        globalRole: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: { permission: { select: { action: true } } },
            },
          },
        },
      },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      // For security reasons, don't reveal if the user exists
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Store token
    await this.prisma.passwordReset.upsert({
      where: { token },
      update: { token, expiresAt },
      create: {
        email: user.email,
        token,
        expiresAt,
      },
    });

    // Send email
    await this.mailerService.sendPasswordResetEmail(user.email, token);

    return { message: 'If an account exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }

    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token: dto.token },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: resetRecord.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete used token
    await this.prisma.passwordReset.delete({
      where: { token: dto.token },
    });

    return { success: true, message: 'Password has been reset successfully' };
  }

  async register(dto: RegisterUserDto) {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Get or Create SUPERADMIN role
    let superAdminRole = await this.prisma.role.findUnique({
      where: { name: 'SUPERADMIN' },
    });

    if (!superAdminRole) {
      superAdminRole = await this.prisma.role.create({
        data: {
          name: 'SUPERADMIN',
          description: 'Global System Administrator',
        },
      });
      // Ensure it has all permissions
      await this.usersService.seedDefaultRoles();
    }

    // Every new registrant is a SUPERADMIN of their own workspace
    const globalRoleId = superAdminRole.id;

    // Create a NEW unique tenant for this new user
    const tenant = await this.prisma.tenant.create({
      data: { name: `${dto.name || email.split('@')[0]}'s Workspace` },
    });

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: dto.name,
        globalRoleId: globalRoleId,
        tenantId: tenant.id,
      },
    });

    const tokens = await this.generateTokens(user.id, user.tenantId);
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        globalRole: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: { permission: { select: { action: true } } },
            },
          },
        },
      },
    });
    return { user: fullUser, ...tokens };
  }

  async login(dto: LoginUserDto, ipAddress?: string) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Attempt to log audit event
    await this.prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: 'login',
          ipAddress,
        },
      })
      .catch((e: unknown) => {
        const err = e as Error;
        console.error('Failed to write audit log', err.message);
      });

    const tokens = await this.generateTokens(user.id, user.tenantId);
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        globalRole: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: { permission: { select: { action: true } } },
            },
          },
        },
      },
    });
    return { user: fullUser, ...tokens };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    const tokens = await this.generateTokens(
      session.userId,
      user?.tenantId || null,
    );

    // Revoke old session
    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.session.updateMany({
      where: { refreshToken },
      data: { isRevoked: true },
    });
    return { success: true };
  }

  async checkSetup() {
    const userCount = await this.prisma.user.count();
    return { setupRequired: userCount === 0 };
  }

  private async generateTokens(userId: string, tenantId?: string | null) {
    const payload = { sub: userId, tenantId };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
