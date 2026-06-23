import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "https://limitlesscoaching.app";

function loadEnv() {
  const envPath = path.resolve(".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
  }
}

loadEnv();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const storageKey = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0]}-auth-token`;

const { data } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email: "daan@austerlitz.nl",
});
const { data: verified } = await supabase.auth.verifyOtp({
  type: "magiclink",
  token_hash: data.properties.hashed_token,
});

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await ctx.newPage();
await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
await page.evaluate(
  ({ storageKey, session }) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      }),
    );
  },
  { storageKey, session: verified.session },
);
await page.goto(`${BASE_URL}/merch`, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
const out = path.resolve("public/app-screenshots/coach-merch.png");
await page.screenshot({ path: out, fullPage: true });
console.log("saved", out);
await browser.close();
