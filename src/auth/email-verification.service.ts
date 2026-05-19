import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MailerService } from '@/common/services/mailer.service';

const CODE_EXPIRY_MINUTES = 15;

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

@Injectable()
export class EmailVerificationService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {}

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) throw new BadRequestException('Código de verificación inválido.');

    if (user.verificationExpiresAt && user.verificationExpiresAt < new Date()) {
      throw new BadRequestException('El código ha expirado. Solicita uno nuevo.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null, verificationExpiresAt: null },
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
      return { message: 'Si la cuenta existe, se ha enviado un código de verificación.' };
    }

    const verificationToken = generateSixDigitCode();
    const verificationExpiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationExpiresAt },
    });

    await this.mailerService.sendVerificationEmail(user.email, verificationToken);

    return { message: 'Si la cuenta existe, se ha enviado un código de verificación.' };
  }

  async checkSetup() {
    const userCount = await this.prisma.user.count();
    return { setupRequired: userCount === 0 };
  }
}
