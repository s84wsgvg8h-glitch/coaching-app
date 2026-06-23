import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL =
  process.env.SCREENSHOT_BASE_URL || "https://limitlesscoaching.app";
const OUT_DIR = path.resolve("public/app-screenshots");

function loadEnv() {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function getSupabaseStorageKey() {
  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(
    ".",
  )[0];
  return `sb-${projectRef}-auth-token`;
}

async function getSessionForEmail(supabase, email) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw error;

  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) throw verifyError;
  if (!verified.session) throw new Error(`No session for ${email}`);
  return verified.session;
}

async function loginAs(page, supabase, email) {
  const session = await getSessionForEmail(supabase, email);
  const storageKey = getSupabaseStorageKey();

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
    { storageKey, session },
  );

  await page.goto(`${BASE_URL}/dashboard`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  if (page.url().includes("/login")) {
    throw new Error(`Login failed for ${email}`);
  }
}

async function capture(page, slug, name) {
  const url = slug.startsWith("http") ? slug : `${BASE_URL}${slug}`;
  const fileName = `${name}.png`;
  const filePath = path.join(OUT_DIR, fileName);

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`✓ ${name}`);
    return { name, fileName, slug, ok: true };
  } catch (error) {
    console.log(`✗ ${name}: ${error.message}`);
    return { name, fileName, slug, ok: false, error: error.message };
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

fs.mkdirSync(OUT_DIR, { recursive: true });

const coachId = "83e1a3f6-a9a7-471c-ae41-15c5e0ca3b85";
const athleteId = "7c2397f1-6b4a-48d8-bcf8-78a90ed364b4";
const programId = "8bc3887d-4631-4787-857f-f870fd73753c";

const publicPages = [
  { slug: "/", name: "00-home" },
  { slug: "/login", name: "01-login" },
  { slug: "/signup", name: "02-signup" },
];

const coachPages = [
  { slug: "/dashboard", name: "coach-dashboard" },
  { slug: "/kennisbank", name: "coach-kennisbank" },
  { slug: "/ai-vragen", name: "coach-ai-vragen" },
  { slug: "/agenda", name: "coach-agenda" },
  { slug: "/wedstrijd-kalender", name: "coach-wedstrijd-kalender" },
  { slug: "/wedstrijd-checklist", name: "coach-wedstrijd-checklist" },
  { slug: "/planning", name: "coach-planning" },
  { slug: "/data", name: "coach-data" },
  { slug: "/statistics", name: "coach-statistics" },
  { slug: "/raw-data", name: "coach-raw-data" },
  { slug: "/invulscore", name: "coach-invulscore" },
  { slug: "/leaderboard", name: "coach-leaderboard" },
  { slug: "/oefeningenbibliotheek", name: "coach-oefeningenbibliotheek" },
  { slug: "/betalingen", name: "coach-betalingen" },
  { slug: "/merch", name: "coach-merch" },
  { slug: "/limitless-data", name: "coach-limitless-data" },
  { slug: "/athletes", name: "coach-athletes" },
  { slug: "/atleten-overzicht", name: "coach-atleten-overzicht" },
  { slug: "/athlete-profiles", name: "coach-athlete-profiles" },
  { slug: `/athletes/${athleteId}`, name: "coach-athlete-hub" },
  { slug: `/profile/${athleteId}`, name: "coach-athlete-profile" },
  { slug: "/todo", name: "coach-todo" },
  { slug: "/chat", name: "coach-chat" },
  { slug: `/chat/${athleteId}`, name: "coach-chat-direct" },
  { slug: "/programs", name: "coach-programs" },
  { slug: `/programs/${programId}`, name: "coach-program-detail" },
  { slug: "/video-review", name: "coach-video-review" },
  { slug: "/video-gallery", name: "coach-video-gallery" },
  { slug: "/doelen", name: "coach-doelen" },
  { slug: "/profile", name: "coach-profile" },
  { slug: "/settings/intake-form", name: "coach-settings-intake-form" },
  { slug: "/settings/competition-checklist", name: "coach-settings-checklist" },
  { slug: "/rpe-tabel", name: "coach-rpe-tabel" },
];

const athletePages = [
  { slug: "/dashboard", name: "athlete-dashboard" },
  { slug: "/programs", name: "athlete-programs" },
  { slug: `/programs/${programId}`, name: "athlete-program-detail" },
  { slug: "/data", name: "athlete-data" },
  { slug: "/meet-week", name: "athlete-meet-week" },
  { slug: "/merch", name: "athlete-merch" },
  { slug: "/chat", name: "athlete-chat" },
  { slug: "/leaderboard", name: "athlete-leaderboard" },
  { slug: "/profile", name: "athlete-profile" },
  { slug: "/intake", name: "athlete-intake" },
  { slug: "/doelen", name: "athlete-doelen" },
];

const adminPages = [{ slug: "/admin", name: "admin-panel" }];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const results = [];

for (const entry of publicPages) {
  results.push(await capture(page, entry.slug, entry.name));
}

await loginAs(page, supabase, "daan@austerlitz.nl");
for (const entry of coachPages) {
  results.push(await capture(page, entry.slug, entry.name));
}

await page.evaluate(() => localStorage.clear());
await context.clearCookies();
await loginAs(page, supabase, "atleet@atleet.com");
for (const entry of athletePages) {
  results.push(await capture(page, entry.slug, entry.name));
}

await page.evaluate(() => localStorage.clear());
await context.clearCookies();
await loginAs(page, supabase, "daan@admin.nl");
for (const entry of adminPages) {
  results.push(await capture(page, entry.slug, entry.name));
}

await browser.close();

fs.writeFileSync(
  path.join(OUT_DIR, "manifest.json"),
  JSON.stringify({ baseUrl: BASE_URL, capturedAt: new Date().toISOString(), results }, null, 2),
);

console.log(`\nSaved ${results.filter((r) => r.ok).length}/${results.length} screenshots to ${OUT_DIR}`);
