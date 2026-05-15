import { Prisma } from '@prisma/client';

export const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  isVerified: true,
  twoFactorEnabled: true,
  createdAt: true,
  tenantId: true,
  globalRole: {
    select: {
      id: true,
      name: true,
      permissions: {
        select: { permission: { select: { action: true } } },
      },
    },
  },
} as const;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends TokenPair {
  user: Prisma.UserGetPayload<{ select: typeof USER_SELECT }> | null;
}

export interface TwoFactorRequiredResult {
  requiresTwoFactor: true;
  tempToken: string;
}
