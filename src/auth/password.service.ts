import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { MailerService } from '@/common/services/mailer.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class PasswordService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      return { message: 'Si la cuenta existe, se ha enviado un enlace de recuperación.' };
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

    return { message: 'Si la cuenta existe, se ha enviado un enlace de recuperación.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token: dto.token },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('El token de recuperación es inválido o ha expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: resetRecord.email },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, loginAttempts: 0, lockedUntil: null },
    });

    await this.prisma.passwordReset.delete({ where: { token: dto.token } });

    return { success: true, message: 'La contraseña se ha restablecido correctamente' };
  }
}
