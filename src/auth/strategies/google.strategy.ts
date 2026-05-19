import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface OAuthProfile {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string | undefined;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') ?? 'dev-placeholder',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') ?? 'dev-placeholder',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') ?? 'http://localhost:5000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('No email from Google profile'), undefined);
      return;
    }
    const user: OAuthProfile = {
      provider: 'google',
      providerId: profile.id,
      email,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, user);
  }
}
