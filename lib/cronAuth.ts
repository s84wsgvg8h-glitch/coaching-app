import { timingSafeEqual } from "crypto";

function safeEqual(candidate: string, secret: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isCronAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? "";

  return safeEqual(bearer, cronSecret) || safeEqual(headerSecret, cronSecret);
}

export function cronUnauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
