import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as QRCode from 'qrcode';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/common/services/audit.service';
import {
  generateTotpSecret,
  generateTotpUri,
  verifyTotpToken,
} from '@/common/utils/totp';
import { TokenService } from './token.service';
import { LoginWithTwoFactorDto } from './dto/two-factor.dto';
import { LoginResult } from './auth.types';
import { USER_SELECT } from './auth.types';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private tokenService: TokenService,
    private auditService: AuditService,
  ) {}

  async generateTwoFactorSecret(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const secret = generateTotpSecret();
    const otpAuthUrl = generateTotpUri(user.email, 'LiveOpsFin', secret);

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
      throw new BadRequestException('Primero genera el secreto 2FA con /auth/2fa/generate');
    }

    const isValid = verifyTotpToken(code, user.twoFactorSecret);
    if (!isValid) throw new BadRequestException('Código inválido. No se habilitó el 2FA.');

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
    if (!isValid) throw new BadRequestException('Código inválido');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return { success: true, message: '2FA deshabilitado correctamente' };
  }

  async loginWithTwoFactor(
    dto: LoginWithTwoFactorDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify<{ sub: string; type: string }>(dto.tempToken);
    } catch {
      throw new UnauthorizedException('Token temporal inválido o expirado');
    }

    if (payload.type !== '2fa_pending') {
      throw new UnauthorizedException('Token temporal inválido');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.twoFactorSecret) throw new UnauthorizedException('2FA no configurado');

    const isValid = verifyTotpToken(dto.code, user.twoFactorSecret);
    if (!isValid) throw new UnauthorizedException('Código 2FA inválido');

    void this.auditService.log({
      userId: user.id,
      action: 'USER_LOGIN_2FA',
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
}
