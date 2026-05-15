import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MailerService } from '@/common/services/mailer.service';

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

    if (!user) throw new BadRequestException('Token de verificación inválido');

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
      return { message: 'Si la cuenta existe, se ha enviado un enlace de verificación.' };
    }

    const verificationToken = String(Math.floor(100000 + Math.random() * 900000));
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken },
    });

    await this.mailerService.sendVerificationEmail(user.email, verificationToken);

    return { message: 'Si la cuenta existe, se ha enviado un enlace de verificación.' };
  }

  async checkSetup() {
    const userCount = await this.prisma.user.count();
    return { setupRequired: userCount === 0 };
  }
}
