/** Seconds — use these when calling cache.set(key, value, { ttl: CACHE_TTL_X }) */
export const CACHE_TTL = {
  PRESENCE: 5,       // WebSocket presence / online status
  ANALYTICS: 300,    // Analytics aggregates
  PROFILE: 3600,     // User profiles
  PRODUCTION: 60,    // Production metadata
  DEFAULT: 60,
} as const;
