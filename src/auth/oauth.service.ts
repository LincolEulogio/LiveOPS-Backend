import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/common/services/audit.service';
import { UsersService } from '@/users/users.service';
import { Role } from '@/common/constants/roles.enum';
import { TokenService } from './token.service';
import { LoginResult, USER_SELECT } from './auth.types';
import type { OAuthProfile } from './strategies/google.strategy';

@Injectable()
export class OAuthService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
    private usersService: UsersService,
    private auditService: AuditService,
  ) {}

  async handleOAuthLogin(
    profile: OAuthProfile,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    let oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: { provider: profile.provider, providerId: profile.providerId },
      },
      include: { user: true },
    });

    let userId: string;
    let tenantId: string | null;

    if (oauthAccount) {
      userId = oauthAccount.userId;
      tenantId = oauthAccount.user.tenantId;
    } else {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (existingUser) {
        await this.prisma.oAuthAccount.create({
          data: {
            userId: existingUser.id,
            provider: profile.provider,
            providerId: profile.providerId,
          },
        });
        userId = existingUser.id;
        tenantId = existingUser.tenantId;
      } else {
        await this.usersService.seedDefaultRoles();
        const viewerRole = await this.prisma.role.findUnique({
          where: { name: Role.VIEWER },
        });

        const tenant = await this.prisma.tenant.create({
          data: { name: `${profile.name}'s Workspace` },
        });

        const newUser = await this.prisma.user.create({
          data: {
            email: profile.email,
            password: await bcrypt.hash(crypto.randomUUID(), 10),
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            isVerified: true,
            globalRoleId: viewerRole?.id,
            tenantId: tenant.id,
          },
        });

        await this.prisma.oAuthAccount.create({
          data: {
            userId: newUser.id,
            provider: profile.provider,
            providerId: profile.providerId,
          },
        });

        userId = newUser.id;
        tenantId = newUser.tenantId;
      }
    }

    void this.auditService.log({
      userId,
      action: `USER_LOGIN_OAUTH_${profile.provider.toUpperCase()}`,
      ipAddress,
      details: { email: profile.email },
    });

    const tokens = await this.tokenService.generateTokens(userId, tenantId, ipAddress, userAgent);
    const fullUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    return { user: fullUser, ...tokens };
  }
}
