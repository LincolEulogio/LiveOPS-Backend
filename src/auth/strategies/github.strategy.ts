import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import type { OAuthProfile } from './google.strategy';

type DoneCallback = (error: Error | null, user?: OAuthProfile) => void;

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') ?? 'dev-placeholder',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') ?? 'dev-placeholder',
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL') ?? 'http://localhost:5000/api/v1/auth/github/callback',
      scope: ['user:email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: DoneCallback,
  ): void {
    const email =
      profile.emails?.[0]?.value ?? `${profile.username}@github.local`;
    const user: OAuthProfile = {
      provider: 'github',
      providerId: profile.id,
      email,
      name: profile.displayName || profile.username || 'GitHub User',
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, user);
  }
}
