import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  name: string;
}

interface ValidatedUser {
  userId: string;
  tenantId: string;
}

function extractJwtFromCookieOrBearer(req: Request): string | null {
  const fromBearer = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromBearer) return fromBearer;
  const cookie = req.cookies as Record<string, string> | undefined;
  return cookie?.['accessToken'] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: extractJwtFromCookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'super-secret',
      passReqToCallback: false,
    });
  }

  validate(payload: JwtPayload): ValidatedUser {
    return { userId: payload.sub, tenantId: payload.tenantId };
  }
}
