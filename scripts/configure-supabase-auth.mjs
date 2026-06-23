#!/usr/bin/env node
/**
 * Configure Supabase Auth Site URL + redirect URLs for production.
 * Requires: SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/configure-supabase-auth.mjs
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/configure-supabase-auth.mjs --url https://app.example.com
 */

const PROJECT_REF = "dgryvmvfwyixscidmzrc";
const DEFAULT_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "https://limitlesscoaching.app";

const appUrl = (process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : DEFAULT_APP_URL
).replace(/\/$/, "");

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens",
  );
  process.exit(1);
}

const redirectUrls = [
  `${appUrl}/**`,
  `${appUrl}/login`,
  `${appUrl}/signup`,
  `${appUrl}/dashboard`,
  "http://localhost:3000/**",
  "http://localhost:3000/login",
  "http://localhost:3000/signup",
];

const body = {
  site_url: appUrl,
  uri_allow_list: redirectUrls.join(","),
  mailer_autoconfirm: false,
  security_captcha_enabled: false,
};

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  },
);

const text = await res.text();
if (!res.ok) {
  console.error("Failed to update auth config:", res.status, text);
  process.exit(1);
}

console.log("Supabase Auth configured for:", appUrl);
console.log("Redirect URLs:", redirectUrls.join("\n  "));
try {
  const json = JSON.parse(text);
  console.log("site_url:", json.site_url);
} catch {
  console.log(text);
}
