const DEFAULT_PRODUCTION_URL = "https://limitlesscoaching.app";

/** Server-side app origin (Stripe redirects, webhooks). */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return DEFAULT_PRODUCTION_URL;
}

/** Client-safe origin for invite links (prefers current window). */
export function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return getAppUrl();
}

/** Supabase Auth redirect URLs to configure in dashboard. */
export function getAuthRedirectUrls(): string[] {
  const base = getAppUrl();
  return [
    `${base}/**`,
    `${base}/login`,
    `${base}/signup`,
    `${base}/dashboard`,
    "http://localhost:3000/**",
    "http://localhost:3000/login",
    "http://localhost:3000/signup",
  ];
}
