import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private configService: ConfigService) {}

  async sendPasswordResetEmail(email: string, token: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    this.logger.log(`[MAILER] Sending password reset email to: ${email}`);
    this.logger.log(`[MAILER] Reset Link: ${resetLink}`);
    
    // In a real production app, you would use nodemailer or a service like Resend/SendGrid
    // console.log(`\n\n---------------- RESET PASSWORD LINK ----------------\n`);
    // console.log(`To: ${email}`);
    // console.log(`Link: ${resetLink}`);
    // console.log(`\n------------------------------------------------------\n\n`);
  }
}
