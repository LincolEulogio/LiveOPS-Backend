import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<number>('SMTP_PORT')),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const verifyLink = `${frontendUrl}/verify-account?token=${token}`;

    this.logger.log(`[MAILER] Sending verification email to: ${email}`);

    const mailOptions = {
      from: '"LiveOps Support" <support@liveops.com>',
      to: email,
      subject: 'Verifica tu cuenta - LiveOps',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333;">Bienvenido a LiveOps</h2>
          <p>Gracias por registrarte. Por favor, verifica tu cuenta haciendo clic en el siguiente botón:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verificar Cuenta</a>
          </div>
          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #007bff;">${verifyLink}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">Si no creaste esta cuenta, puedes ignorar este correo.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error}`);
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    this.logger.log(`[MAILER] Sending password reset email to: ${email}`);

    const mailOptions = {
      from: '"LiveOps Support" <support@liveops.com>',
      to: email,
      subject: 'Restablecer contraseña - LiveOps',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333;">Restablecer tu contraseña</h2>
          <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer Contraseña</a>
          </div>
          <p>Este enlace expirará en 1 hora.</p>
          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #dc3545;">${resetLink}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">Si no solicitaste esto, puedes ignorar este correo de forma segura.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error}`);
    }
  }
}
