import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth guards run client-side in AuthProvider (Supabase session lives in
 * localStorage with the browser client). Server middleware cannot read that
 * session, so we must not redirect unauthenticated requests here — doing so
 * breaks login with an endless /login loop after signInWithPassword.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const isProd = process.env.NODE_ENV === "production";

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), payment=(self)",
  );

  if (isProd) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const mediaSrc = ["'self'", "blob:", supabaseOrigin].filter(Boolean).join(" ");
  const connectSrc = [
    "'self'",
    supabaseOrigin,
    supabaseOrigin?.replace(/^https:/, "wss:"),
    "https://api.stripe.com",
    "https://checkout.stripe.com",
  ]
    .filter(Boolean)
    .join(" ");

  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      `media-src ${mediaSrc}`,
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      "frame-src https://checkout.stripe.com https://js.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  );

  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
