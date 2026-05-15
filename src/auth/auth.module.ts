import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '@/users/users.module';
import { AuditModule } from '@/audit/audit.module';
import { MailerService } from '@/common/services/mailer.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GitHubStrategy } from './strategies/github.strategy';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { EmailVerificationService } from './email-verification.service';
import { TwoFactorService } from './two-factor.service';
import { OAuthService } from './oauth.service';
import { SessionsService } from './sessions.service';

const AUTH_PROVIDERS = [
  AuthService,
  TokenService,
  PasswordService,
  EmailVerificationService,
  TwoFactorService,
  OAuthService,
  SessionsService,
  JwtStrategy,
  GoogleStrategy,
  GitHubStrategy,
  MailerService,
];

@Module({
  imports: [
    PassportModule,
    UsersModule,
    AuditModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'super-secret',
        signOptions: { expiresIn: '6h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: AUTH_PROVIDERS,
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
