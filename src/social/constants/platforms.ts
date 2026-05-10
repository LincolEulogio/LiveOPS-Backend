export const PLATFORM_MAP: Record<string, string> = {
  youtube: 'youtube',
  facebook: 'facebook',
  twitch: 'twitch',
  tiktok: 'tiktok',
  instagram: 'instagram',
  twitter: 'twitter',
  linkedin: 'linkedin',
  kick: 'kick',
  trovo: 'trovo',
};

export function normalizePlatform(raw: string | undefined): string {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  return PLATFORM_MAP[lower] ?? lower;
}
