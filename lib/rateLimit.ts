type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  options: { max: number; windowMs: number },
): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true };
  }

  if (entry.count >= options.max) {
    return { ok: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { ok: true };
}
