import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from '@/auth/dto/register-user.dto';
import { LoginUserDto } from '@/auth/dto/login-user.dto';
import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto';
import { LoginWithTwoFactorDto } from '@/auth/dto/two-factor.dto';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { UsersService } from '@/users/users.service';
import { MailerService } from '@/common/services/mailer.service';
import { Role } from '@/common/constants/roles.enum';
import { AuditService } from '@/common/services/audit.service';
import {
  generateTotpSecret,
  generateTotpUri,
  verifyTotpToken,
} from '@/common/utils/totp';
import * as QRCode from 'qrcode';
import type { OAuthProfile } from '@/auth/strategies/google.strategy';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  isVerified: true,
  twoFactorEnabled: true,
  createdAt: true,
  tenantId: true,
  globalRole: {
    select: {
      id: true,
      name: true,
      permissions: {
        select: { permission: { select: { action: true } } },
      },
    },
  },
} as const;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface LoginResult extends TokenPair {
  user: Prisma.UserGetPayload<{ select: typeof USER_SELECT }> | null;
}

interface TwoFactorRequiredResult {
  requiresTwoFactor: true;
  tempToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private mailerService: MailerService,
    private auditService: AuditService,
  ) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: USER_SELECT,
    });
  }

  async updateProfile(
    userId: string,
    data: { name?: string; password?: string; avatarUrl?: string },
  ) {
    const updateData: Prisma.UserUpdateInput = {};
    if (data.name) updateData.name = data.name;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.password)
      updateData.password = await bcrypt.hash(data.password, 10);

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: USER_SELECT,
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      return {
        message:
          'Si la cuenta existe, se ha enviado un enlace de recuperación.',
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordReset.upsert({
      where: { token },
      update: { token, expiresAt },
      create: { email: user.email, token, expiresAt },
    });

    await this.mailerService.sendPasswordResetEmail(user.email, token);

    return {
      message: 'Si la cuenta existe, se ha enviado un enlace de recuperación.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token: dto.token },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException(
        'El token de recuperación es inválido o ha expirado',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: resetRecord.email },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, loginAttempts: 0, lockedUntil: null },
    });

    await this.prisma.passwordReset.delete({ where: { token: dto.token } });

    return {
      success: true,
      message: 'La contraseña se ha restablecido correctamente',
    };
  }

  async register(dto: RegisterUserDto) {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('El correo electrónico ya está en uso');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.usersService.seedDefaultRoles();

    const existingUserCount = await this.prisma.user.count();
    const assignedRoleName =
      existingUserCount === 0 ? Role.SUPERADMIN : Role.VIEWER;

    const assignedRole = await this.prisma.role.findUnique({
      where: { name: assignedRoleName },
    });

    if (!assignedRole) {
      throw new Error(`Role ${assignedRoleName} not found after seeding`);
    }

    const tenant = await this.prisma.tenant.create({
      data: { name: `${dto.name ?? email.split('@')[0]}'s Workspace` },
    });

    const verificationToken = String(
      Math.floor(100000 + Math.random() * 900000),
    );

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: dto.name,
        globalRoleId: assignedRole.id,
        tenantId: tenant.id,
        isVerified: false,
        verificationToken,
      },
    });

    await this.mailerService.sendVerificationEmail(
      user.email,
      verificationToken,
    );

    void this.auditService.log({
      userId: user.id,
      action: 'USER_REGISTER',
      details: { email: user.email, name: user.name },
    });

    const tokens = await this.generateTokens(user.id, user.tenantId);
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: USER_SELECT,
    });
    return { user: fullUser, ...tokens };
  }

  async login(
    dto: LoginUserDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult | TwoFactorRequiredResult> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Usuario o contraseña inválidos');
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Cuenta bloqueada. Intenta de nuevo en ${minutesLeft} minuto(s).`,
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      const newAttempts = user.loginAttempts + 1;
      const lockedUntil =
        newAttempts >= MAX_LOGIN_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: newAttempts, lockedUntil },
      });

      if (lockedUntil) {
        throw new ForbiddenException(
          `Demasiados intentos fallidos. Cuenta bloqueada por ${LOCKOUT_MINUTES} minutos.`,
        );
      }

      throw new UnauthorizedException('Usuario o contraseña inválidos');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Por favor, verifica tu cuenta antes de iniciar sesión',
      );
    }

    // Reset failed attempts on successful password match
    await this.prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    // If 2FA is enabled, return a temp token instead of full session
    if (user.twoFactorEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, type: '2fa_pending' },
        { expiresIn: '5m' },
      );
      return { requiresTwoFactor: true, tempToken };
    }

    void this.auditService.log({
      userId: user.id,
      action: 'USER_LOGIN',
      ipAddress,
      details: { email: user.email },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.tenantId,
      ipAddress,
      userAgent,
    );
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: USER_SELECT,
    });
    return { user: fullUser, ...tokens };
  }

  async loginWithTwoFactor(
    dto: LoginWithTwoFactorDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify<{ sub: string; type: string }>(
        dto.tempToken,
      );
    } catch {
      throw new UnauthorizedException('Token temporal inválido o expirado');
    }

    if (payload.type !== '2fa_pending') {
      throw new UnauthorizedException('Token temporal inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user?.twoFactorSecret) {
      throw new UnauthorizedException('2FA no configurado');
    }

    const isValid = verifyTotpToken(dto.code, user.twoFactorSecret);

    if (!isValid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }

    void this.auditService.log({
      userId: user.id,
      action: 'USER_LOGIN_2FA',
      ipAddress,
      details: { email: user.email },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.tenantId,
      ipAddress,
      userAgent,
    );
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: USER_SELECT,
    });
    return { user: fullUser, ...tokens };
  }

  async generateTwoFactorSecret(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const secret = generateTotpSecret();
    const otpAuthUrl = generateTotpUri(user.email, 'LiveOpsFin', secret);

    // Store secret temporarily (not enabled until verified)
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    return { secret, qrCodeDataUrl };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException(
        'Primero genera el secreto 2FA con /auth/2fa/generate',
      );
    }

    const isValid = verifyTotpToken(code, user.twoFactorSecret);
    if (!isValid) {
      throw new BadRequestException('Código inválido. No se habilitó el 2FA.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { success: true, message: '2FA habilitado correctamente' };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('El 2FA no está habilitado');
    }

    const isValid = verifyTotpToken(code, user.twoFactorSecret);
    if (!isValid) {
      throw new BadRequestException('Código inválido');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return { success: true, message: '2FA deshabilitado correctamente' };
  }

  async handleOAuthLogin(
    profile: OAuthProfile,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    let oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: profile.provider,
          providerId: profile.providerId,
        },
      },
      include: { user: true },
    });

    let userId: string;
    let tenantId: string | null;

    if (oauthAccount) {
      userId = oauthAccount.userId;
      tenantId = oauthAccount.user.tenantId;
    } else {
      // Check if email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (existingUser) {
        // Link OAuth to existing account
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
        // Create new user
        await this.usersService.seedDefaultRoles();
        const viewerRole = await this.prisma.role.findUnique({
          where: { name: Role.VIEWER },
        });

        const tenant = await this.prisma.tenant.create({
          data: {
            name: `${profile.name}'s Workspace`,
          },
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

    const tokens = await this.generateTokens(userId, tenantId, ipAddress, userAgent);
    const fullUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    return { user: fullUser, ...tokens };
  }

  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });
    return { success: true };
  }

  async revokeAllSessions(userId: string, exceptToken?: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        isRevoked: false,
        ...(exceptToken ? { refreshToken: { not: exceptToken } } : {}),
      },
      data: { isRevoked: true },
    });
    return { success: true };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('La sesión ha expirado o es inválida');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });

    // Revoke old session (token rotation)
    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    return this.generateTokens(
      session.userId,
      user?.tenantId ?? null,
      ipAddress,
      userAgent,
    );
  }

  async logout(refreshToken: string) {
    await this.prisma.session.updateMany({
      where: { refreshToken },
      data: { isRevoked: true },
    });
    return { success: true };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Token de verificación inválido');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null },
    });

    return {
      success: true,
      message: 'Cuenta verificada correctamente. Ya puedes iniciar sesión.',
    };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || user.isVerified) {
      return {
        message:
          'Si la cuenta existe, se ha enviado un enlace de verificación.',
      };
    }

    const verificationToken = String(
      Math.floor(100000 + Math.random() * 900000),
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken },
    });

    await this.mailerService.sendVerificationEmail(
      user.email,
      verificationToken,
    );

    return {
      message: 'Si la cuenta existe, se ha enviado un enlace de verificación.',
    };
  }

  async checkSetup() {
    const userCount = await this.prisma.user.count();
    return { setupRequired: userCount === 0 };
  }

  private async generateTokens(
    userId: string,
    tenantId?: string | null,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const payload = { sub: userId, tenantId };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '6h' });

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return { accessToken, refreshToken };
  }
}
