import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { Prisma } from '@prisma/client';

import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) { }

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

  async register(dto: RegisterUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // If it's the first user, make them ADMIN
    const userCount = await this.prisma.user.count();
    let globalRoleId: string | undefined;

    if (userCount === 0) {
      let superAdminRole = await this.prisma.role.findUnique({
        where: { name: 'SUPERADMIN' },
      });

      if (!superAdminRole) {
        superAdminRole = await this.prisma.role.create({
          data: { name: 'SUPERADMIN', description: 'Global System Administrator' }
        });
      }

      globalRoleId = superAdminRole.id;
      // Trigger full seeding to ensure permissions are attached
      await this.usersService.seedDefaultRoles();
    }

    let defaultTenant = await this.prisma.tenant.findFirst();
    if (!defaultTenant) {
      defaultTenant = await this.prisma.tenant.create({ data: { name: 'System Default' } });
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        globalRoleId: globalRoleId,
        tenantId: defaultTenant.id,
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
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

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    const tokens = await this.generateTokens(session.userId, user?.tenantId || null);

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
