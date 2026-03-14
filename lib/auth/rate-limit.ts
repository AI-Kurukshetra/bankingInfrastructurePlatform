/**
 * In-memory sliding window rate limiter.
 *
 * Works correctly in single-process environments (local dev, single serverless
 * instance). For multi-instance production deployments on Vercel or similar,
 * replace the store with a Redis-backed implementation (e.g. @upstash/ratelimit).
 */

type WindowEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, WindowEntry>();

// Prune expired entries every minute to prevent unbounded memory growth.
const pruneInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 60_000);

// Allow the process to exit cleanly even if the interval is still running.
if (typeof pruneInterval.unref === "function") {
  pruneInterval.unref();
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Checks whether the given key has exceeded its rate limit.
 *
 * @param key       Unique identifier for the rate limit bucket (e.g. `login:127.0.0.1`)
 * @param limit     Maximum number of requests allowed in the window
 * @param windowMs  Length of the sliding window in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed: entry.count <= limit,
    remaining,
    resetAt: entry.resetAt
  };
}
