import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Get('check-setup')
  checkSetup() {
    return this.authService.checkSetup();
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @Req() req: any,
    @Body() data: { name?: string; password?: string },
  ) {
    return this.authService.updateProfile(req.user.userId, data);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginUserDto, @Req() req: any) {
    return this.authService.login(dto, req.ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }
}
