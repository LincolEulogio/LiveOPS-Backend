import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

const BRAND = {
  indigo: '#6366f1',
  indigoDark: '#4f46e5',
  indigoLight: '#eef2ff',
  slate900: '#0f172a',
  slate700: '#334155',
  slate400: '#94a3b8',
  slate100: '#f1f5f9',
  white: '#ffffff',
  red: '#ef4444',
  redLight: '#fef2f2',
};

function emailShell(accentColor: string, accentLight: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LiveOPS</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- ── Header / Logo ── -->
          <tr>
            <td style="background-color:${BRAND.slate900};border-radius:16px 16px 0 0;padding:28px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <!-- Zap icon box -->
                    <div style="display:inline-block;width:40px;height:40px;background-color:${BRAND.indigo};border-radius:10px;text-align:center;line-height:40px;vertical-align:middle;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="0" style="display:inline-block;vertical-align:middle;margin-top:-2px;">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                    </div>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <div style="font-size:18px;font-weight:900;color:${BRAND.white};letter-spacing:-0.5px;font-style:italic;text-transform:uppercase;line-height:1.1;">LiveOPS</div>
                    <div style="font-size:9px;font-weight:800;color:${BRAND.indigo};letter-spacing:3px;text-transform:uppercase;margin-top:2px;">Control Surface</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Accent bar ── -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,${accentColor} 0%,${BRAND.indigo} 100%);"></td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="background-color:${BRAND.white};padding:40px 40px 32px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
              ${content}
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:24px 0 8px;text-align:center;">
              <p style="margin:0;font-size:12px;color:${BRAND.slate400};">Movimiento Misionero Mundial &mdash; LiveOPS Core &copy; 2026</p>
              <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">Este mensaje fue generado automáticamente, por favor no respondas.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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

    const body = `
      <!-- Badge -->
      <div style="display:inline-block;background-color:${BRAND.indigoLight};border-radius:20px;padding:6px 14px;margin-bottom:24px;">
        <span style="font-size:12px;font-weight:700;color:${BRAND.indigo};letter-spacing:0.5px;text-transform:uppercase;">Verificación de Cuenta</span>
      </div>

      <h2 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${BRAND.slate900};line-height:1.2;">¡Bienvenido a LiveOPS!</h2>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.slate700};line-height:1.6;">
        Tu cuenta ha sido creada correctamente. Para activarla y comenzar a operar, verifica tu correo electrónico haciendo clic en el botón de abajo.
      </p>

      <!-- CTA Button -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${verifyLink}"
           style="display:inline-block;background-color:${BRAND.indigo};color:${BRAND.white};padding:14px 36px;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.3px;transition:background 0.2s;">
          &#9889;&nbsp; Verificar Cuenta
        </a>
      </div>

      <!-- Info box -->
      <div style="background-color:${BRAND.slate100};border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:${BRAND.slate700};line-height:1.5;">
          <strong>¿El botón no funciona?</strong> Copia y pega el siguiente enlace en tu navegador:
        </p>
        <p style="margin:8px 0 0;font-size:12px;word-break:break-all;color:${BRAND.indigo};">${verifyLink}</p>
      </div>

      <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0 20px;" />
      <p style="margin:0;font-size:12px;color:${BRAND.slate400};line-height:1.5;">
        Si no creaste esta cuenta en LiveOPS, puedes ignorar este correo de forma segura. Nadie más puede acceder a tu cuenta sin verificarla.
      </p>
    `;

    const html = emailShell(BRAND.indigo, BRAND.indigoLight, body);

    try {
      await this.transporter.sendMail({
        from: '"LiveOPS" <support@liveops.com>',
        to: email,
        subject: '⚡ Verifica tu cuenta — LiveOPS',
        html,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send verification email: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    this.logger.log(`[MAILER] Sending password reset email to: ${email}`);

    const body = `
      <!-- Badge -->
      <div style="display:inline-block;background-color:${BRAND.redLight};border-radius:20px;padding:6px 14px;margin-bottom:24px;">
        <span style="font-size:12px;font-weight:700;color:${BRAND.red};letter-spacing:0.5px;text-transform:uppercase;">Restablecimiento de Contraseña</span>
      </div>

      <h2 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${BRAND.slate900};line-height:1.2;">Restablecer tu contraseña</h2>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.slate700};line-height:1.6;">
        Recibimos una solicitud para restablecer la contraseña asociada a tu cuenta de LiveOPS. Haz clic en el botón de abajo para continuar.
      </p>

      <!-- CTA Button -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetLink}"
           style="display:inline-block;background-color:${BRAND.red};color:${BRAND.white};padding:14px 36px;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.3px;">
          🔑&nbsp; Restablecer Contraseña
        </a>
      </div>

      <!-- Expiry warning -->
      <div style="background-color:#fff7ed;border-left:4px solid #f97316;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#9a3412;font-weight:600;">⏱ Este enlace expirará en <strong>1 hora</strong>.</p>
      </div>

      <!-- Info box -->
      <div style="background-color:${BRAND.slate100};border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:${BRAND.slate700};line-height:1.5;">
          <strong>¿El botón no funciona?</strong> Copia y pega el siguiente enlace en tu navegador:
        </p>
        <p style="margin:8px 0 0;font-size:12px;word-break:break-all;color:${BRAND.red};">${resetLink}</p>
      </div>

      <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0 20px;" />
      <p style="margin:0;font-size:12px;color:${BRAND.slate400};line-height:1.5;">
        Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu contraseña actual permanecerá sin cambios.
      </p>
    `;

    const html = emailShell(BRAND.red, BRAND.redLight, body);

    try {
      await this.transporter.sendMail({
        from: '"LiveOPS" <support@liveops.com>',
        to: email,
        subject: '🔑 Restablece tu contraseña — LiveOPS',
        html,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send password reset email: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
