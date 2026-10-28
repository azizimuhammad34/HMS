type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Simple in-memory rate limiter (single Node process).
 * For multi-instance production, replace with Redis or equivalent.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Test helper */
export function clearAllRateLimits(): void {
  buckets.clear();
}
