/**
 * In-memory sliding-window rate limiter for AI API endpoints.
 *
 * Tracks usage per identifier (userId or IP) with a daily reset window.
 * Suitable for single-instance Next.js deployments.
 */

/** Daily limits by auth status. */
const DAILY_LIMIT_ANONYMOUS = 3;
const DAILY_LIMIT_AUTHENTICATED = 10;

/** Duration of the rate-limit window in milliseconds (24 hours). */
const WINDOW_MS = 24 * 60 * 60 * 1000;

interface RateLimitEntry {
  timestamps: number[];
}

/** In-memory store keyed by identifier. */
const store = new Map<string, RateLimitEntry>();

/** Periodically clean up expired entries (every 10 minutes). */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

setInterval(cleanup, CLEANUP_INTERVAL_MS);

export interface RateLimitResult {
  /** Whether the request is allowed. */
  readonly allowed: boolean;
  /** Number of requests used in the current window. */
  readonly used: number;
  /** Maximum requests allowed in the window. */
  readonly limit: number;
  /** Remaining requests in the window. */
  readonly remaining: number;
}

/**
 * Check and consume one rate-limit token for the given identifier.
 *
 * @param identifier - userId (authenticated) or IP (anonymous)
 * @param isAuthenticated - whether the user is logged in
 */
export function checkRateLimit(
  identifier: string,
  isAuthenticated: boolean,
): RateLimitResult {
  const limit = isAuthenticated ? DAILY_LIMIT_AUTHENTICATED : DAILY_LIMIT_ANONYMOUS;
  const now = Date.now();

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  const used = entry.timestamps.length;

  if (used >= limit) {
    return { allowed: false, used, limit, remaining: 0 };
  }

  // Consume one token
  entry.timestamps.push(now);

  return {
    allowed: true,
    used: used + 1,
    limit,
    remaining: limit - used - 1,
  };
}

/**
 * Peek at current usage without consuming a token.
 */
export function peekRateLimit(
  identifier: string,
  isAuthenticated: boolean,
): RateLimitResult {
  const limit = isAuthenticated ? DAILY_LIMIT_AUTHENTICATED : DAILY_LIMIT_ANONYMOUS;
  const now = Date.now();

  const entry = store.get(identifier);
  if (!entry) {
    return { allowed: true, used: 0, limit, remaining: limit };
  }

  const validTimestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
  const used = validTimestamps.length;

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}
