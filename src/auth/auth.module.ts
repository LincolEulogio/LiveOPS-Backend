import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@/auth/auth.service';
import { AuthController } from '@/auth/auth.controller';
import { JwtStrategy } from '@/auth/jwt.strategy';
import { GoogleStrategy } from '@/auth/strategies/google.strategy';
import { GitHubStrategy } from '@/auth/strategies/github.strategy';
import { UsersModule } from '@/users/users.module';
import { MailerService } from '@/common/services/mailer.service';
import { AuditModule } from '@/audit/audit.module';

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
  providers: [AuthService, JwtStrategy, GoogleStrategy, GitHubStrategy, MailerService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
