import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Res,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '@/auth/auth.service';
import { RegisterUserDto } from '@/auth/dto/register-user.dto';
import { LoginUserDto } from '@/auth/dto/login-user.dto';
import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto';
import { VerifyTwoFactorDto, LoginWithTwoFactorDto } from '@/auth/dto/two-factor.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import type { Request, Response, CookieOptions } from 'express';
import type { OAuthProfile } from '@/auth/strategies/google.strategy';

interface TwoFactorRequired {
  requiresTwoFactor: true;
  tempToken: string;
}

interface RequestWithUser extends Request {
  user: {
    userId: string;
    tenantId: string;
  };
}

interface RequestWithOAuthProfile extends Request {
  user: OAuthProfile;
}

const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/v1/auth',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Throttle({ auth: { limit: 3, ttl: 60000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body('email') email: string) {
    return this.authService.resendVerification(email);
  }

  @Get('check-setup')
  checkSetup() {
    return this.authService.checkSetup();
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: RequestWithUser) {
    return this.authService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @Req() req: RequestWithUser,
    @Body() data: { name?: string; password?: string; avatarUrl?: string },
  ) {
    return this.authService.updateProfile(req.user.userId, data);
  }

  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginUserDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto,
      req.ip ?? '127.0.0.1',
      req.headers['user-agent'],
    );

    if ('requiresTwoFactor' in result) {
      return result as TwoFactorRequired;
    }

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('login/2fa')
  @HttpCode(HttpStatus.OK)
  async loginWithTwoFactor(
    @Body() dto: LoginWithTwoFactorDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginWithTwoFactor(
      dto,
      req.ip ?? '127.0.0.1',
      req.headers['user-agent'],
    );
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const tokenFromCookie = cookies?.['refreshToken'];
    const tokenFromBody = (req.body as { refreshToken?: string })?.refreshToken;
    const token = tokenFromCookie ?? tokenFromBody;

    const result = await this.authService.refresh(
      token as string,
      req.ip ?? '127.0.0.1',
      req.headers['user-agent'],
    );
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const tokenFromCookie = cookies?.['refreshToken'];
    const tokenFromBody = (req.body as { refreshToken?: string })?.refreshToken;
    const token = tokenFromCookie ?? tokenFromBody ?? '';

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    return this.authService.logout(token);
  }

  // ─── 2FA ────────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  generateTwoFactor(@Req() req: RequestWithUser) {
    return this.authService.generateTwoFactorSecret(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  enableTwoFactor(
    @Req() req: RequestWithUser,
    @Body() dto: VerifyTwoFactorDto,
  ) {
    return this.authService.enableTwoFactor(req.user.userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  disableTwoFactor(
    @Req() req: RequestWithUser,
    @Body() dto: VerifyTwoFactorDto,
  ) {
    return this.authService.disableTwoFactor(req.user.userId, dto.code);
  }

  // ─── OAuth ──────────────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google — no body needed
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: RequestWithOAuthProfile,
    @Res() res: Response,
  ) {
    const result = await this.authService.handleOAuthLogin(
      req.user,
      req.ip ?? '127.0.0.1',
      req.headers['user-agent'],
    );
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    const frontendUrl =
      process.env.FRONTEND_URL ?? 'http://localhost:4000';
    res.redirect(
      `${frontendUrl}/oauth/callback?accessToken=${result.accessToken}`,
    );
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {
    // Passport redirects to GitHub — no body needed
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(
    @Req() req: RequestWithOAuthProfile,
    @Res() res: Response,
  ) {
    const result = await this.authService.handleOAuthLogin(
      req.user,
      req.ip ?? '127.0.0.1',
      req.headers['user-agent'],
    );
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    const frontendUrl =
      process.env.FRONTEND_URL ?? 'http://localhost:4000';
    res.redirect(
      `${frontendUrl}/oauth/callback?accessToken=${result.accessToken}`,
    );
  }

  // ─── Sessions ───────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  getSessions(@Req() req: RequestWithUser) {
    return this.authService.getSessions(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  revokeSession(
    @Req() req: RequestWithUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.revokeSession(req.user.userId, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const currentToken = cookies?.['refreshToken'];
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    return this.authService.revokeAllSessions(req.user.userId, currentToken);
  }
}
