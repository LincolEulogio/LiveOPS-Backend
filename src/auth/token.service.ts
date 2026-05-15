import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { TokenPair } from './auth.types';

@Injectable()
export class TokenService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async generateTokens(
    userId: string,
    tenantId?: string | null,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const payload = { sub: userId, tenantId };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '6h' });

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.session.create({
      data: { userId, refreshToken, expiresAt, ipAddress, userAgent },
    });

    return { accessToken, refreshToken };
  }
}
