import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersService } from '@/users/users.service';
import { AuditService } from '@/common/services/audit.service';
import { MailerService } from '@/common/services/mailer.service';
import { Role } from '@/common/constants/roles.enum';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginWithTwoFactorDto } from './dto/two-factor.dto';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { EmailVerificationService } from './email-verification.service';
import { TwoFactorService } from './two-factor.service';
import { OAuthService } from './oauth.service';
import { SessionsService } from './sessions.service';
import { LoginResult, TwoFactorRequiredResult, USER_SELECT } from './auth.types';
import type { OAuthProfile } from './strategies/google.strategy';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private mailerService: MailerService,
    private auditService: AuditService,
    private tokenService: TokenService,
    private passwordService: PasswordService,
    private emailVerificationService: EmailVerificationService,
    private twoFactorService: TwoFactorService,
    private oauthService: OAuthService,
    private sessionsService: SessionsService,
  ) {}

  // ─── Core auth ────────────────────────────────────────────────────────────

  async register(dto: RegisterUserDto) {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('El correo electrónico ya está en uso');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.usersService.seedDefaultRoles();

    const existingUserCount = await this.prisma.user.count();
    const assignedRoleName = existingUserCount === 0 ? Role.SUPERADMIN : Role.VIEWER;
    const assignedRole = await this.prisma.role.findUnique({ where: { name: assignedRoleName } });

    if (!assignedRole) throw new Error(`Role ${assignedRoleName} not found after seeding`);

    const tenant = await this.prisma.tenant.create({
      data: { name: `${dto.name ?? email.split('@')[0]}'s Workspace` },
    });

    const verificationToken = String(Math.floor(100000 + Math.random() * 900000));

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

    await this.mailerService.sendVerificationEmail(user.email, verificationToken);

    void this.auditService.log({
      userId: user.id,
      action: 'USER_REGISTER',
      details: { email: user.email, name: user.name },
    });

    const tokens = await this.tokenService.generateTokens(user.id, user.tenantId);
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

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

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

    const tokens = await this.tokenService.generateTokens(user.id, user.tenantId, ipAddress, userAgent);
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: USER_SELECT,
    });
    return { user: fullUser, ...tokens };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');

    const session = await this.prisma.session.findUnique({ where: { refreshToken } });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('La sesión ha expirado o es inválida');
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });

    // Token rotation — revoke old session
    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    return this.tokenService.generateTokens(session.userId, user?.tenantId ?? null, ipAddress, userAgent);
  }

  async logout(refreshToken: string) {
    await this.prisma.session.updateMany({
      where: { refreshToken },
      data: { isRevoked: true },
    });
    return { success: true };
  }

  // ─── Profile — delegates to UsersService ──────────────────────────────────

  getProfile(userId: string) {
    return this.usersService.getProfile(userId);
  }

  updateProfile(
    userId: string,
    data: { name?: string; password?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateProfile(userId, data);
  }

  // ─── Delegated — Password ─────────────────────────────────────────────────

  forgotPassword(dto: ForgotPasswordDto) {
    return this.passwordService.forgotPassword(dto);
  }

  resetPassword(dto: ResetPasswordDto) {
    return this.passwordService.resetPassword(dto);
  }

  // ─── Delegated — Email verification ───────────────────────────────────────

  verifyEmail(token: string) {
    return this.emailVerificationService.verifyEmail(token);
  }

  resendVerification(email: string) {
    return this.emailVerificationService.resendVerification(email);
  }

  checkSetup() {
    return this.emailVerificationService.checkSetup();
  }

  // ─── Delegated — 2FA ──────────────────────────────────────────────────────

  generateTwoFactorSecret(userId: string) {
    return this.twoFactorService.generateTwoFactorSecret(userId);
  }

  enableTwoFactor(userId: string, code: string) {
    return this.twoFactorService.enableTwoFactor(userId, code);
  }

  disableTwoFactor(userId: string, code: string) {
    return this.twoFactorService.disableTwoFactor(userId, code);
  }

  loginWithTwoFactor(
    dto: LoginWithTwoFactorDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    return this.twoFactorService.loginWithTwoFactor(dto, ipAddress, userAgent);
  }

  // ─── Delegated — OAuth ────────────────────────────────────────────────────

  handleOAuthLogin(
    profile: OAuthProfile,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    return this.oauthService.handleOAuthLogin(profile, ipAddress, userAgent);
  }

  // ─── Delegated — Sessions ─────────────────────────────────────────────────

  getSessions(userId: string) {
    return this.sessionsService.getSessions(userId);
  }

  revokeSession(userId: string, sessionId: string) {
    return this.sessionsService.revokeSession(userId, sessionId);
  }

  revokeAllSessions(userId: string, exceptToken?: string) {
    return this.sessionsService.revokeAllSessions(userId, exceptToken);
  }
}
