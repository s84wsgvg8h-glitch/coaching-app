import { checkRateLimit } from "@/lib/rateLimit";

type RateLimitOptions = {
  max: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  retryAfterMs?: number;
  backend: "memory" | "upstash";
};

async function checkUpstashRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const windowSec = Math.ceil(options.windowMs / 1000);
  const bucketKey = `ratelimit:${key}:${Math.floor(Date.now() / options.windowMs)}`;

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", bucketKey],
        ["EXPIRE", bucketKey, windowSec],
      ]),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as Array<{ result?: number }>;
    const count = payload[0]?.result ?? 1;

    if (count > options.max) {
      return {
        ok: false,
        retryAfterMs: options.windowMs,
        backend: "upstash",
      };
    }

    return { ok: true, backend: "upstash" };
  } catch {
    return null;
  }
}

export async function checkDistributedRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const upstash = await checkUpstashRateLimit(key, options);
  if (upstash) return upstash;

  const memory = checkRateLimit(key, options);
  return {
    ...memory,
    backend: "memory",
  };
}

export function rateLimitHeaders(retryAfterMs?: number): HeadersInit {
  if (!retryAfterMs) return {};
  return {
    "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
  };
}
