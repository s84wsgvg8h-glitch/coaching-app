import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Hosts allowed to connect to the Next.js dev server (for LAN device testing).
  // Add your Mac's local IP here if you want to test on a physical iPhone over WiFi.
  allowedDevOrigins: ["192.168.1.171", "192.168.2.13", "localhost"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  // Allow eval() in dev mode so Capacitor WKWebView can load the Next.js dev server
  // without triggering the React "eval() is not supported" error overlay.
  // This header is only applied in development (next dev) — never in production.
  ...(process.env.NODE_ENV === "development" && {
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            {
              key: "Content-Security-Policy",
              value:
                "default-src * 'unsafe-inline' 'unsafe-eval' blob: data:; connect-src * ws: wss:;",
            },
          ],
        },
      ];
    },
  }),
};

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      disableLogger: true,
    })
  : nextConfig;