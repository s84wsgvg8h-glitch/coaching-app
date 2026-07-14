#!/usr/bin/env node
/**
 * Capture App Store screenshots (iPhone 6.7" — 1290×2796) using review demo accounts.
 *
 * Output: docs/app-store-screenshots/iphone-67/
 *
 * Usage:
 *   node scripts/capture-app-store-screenshots.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL =
  process.env.SCREENSHOT_BASE_URL || "https://limitlesscoaching.app";
const OUT_DIR = path.resolve("docs/app-store-screenshots/iphone-67");

const REVIEW = {
  coachEmail:
    process.env.REVIEW_COACH_EMAIL || "review-coach@limitlesscoaching.app",
  athleteEmail:
    process.env.REVIEW_ATHLETE_EMAIL || "review-athlete@limitlesscoaching.app",
  coachId: process.env.REVIEW_COACH_ID || "f8991651-5cd6-424c-a7c8-a8a105690aed",
  athleteId:
    process.env.REVIEW_ATHLETE_ID || "53614983-0507-4bf2-a754-5bbc9a029b24",
  blockId:
    process.env.REVIEW_BLOCK_ID || "08a7b362-0efb-4357-9651-50960ec5c559",
  weekId:
    process.env.REVIEW_WEEK_ID || "f86e06a5-48bb-4275-bb06-975c40cfab98",
};

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
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(2500);

  if (page.url().includes("/login")) {
    throw new Error(`Login failed for ${email}`);
  }
}

async function capture(page, fileName, targetUrl, waitMs = 2500) {
  const filePath = path.join(OUT_DIR, fileName);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: filePath, fullPage: false });
  const stats = fs.statSync(filePath);
  console.log(`✓ ${fileName} (${stats.size} bytes)`);
  return { fileName, ok: true, bytes: stats.size };
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: devices["iPhone 14 Pro Max"].userAgent,
    colorScheme: "dark",
    locale: "nl-NL",
  });
  const page = await context.newPage();
  const results = [];

  // 1 — Coach dashboard
  await loginAs(page, supabase, REVIEW.coachEmail);
  results.push(
    await capture(
      page,
      "01-coach-dashboard.png",
      `${BASE_URL}/dashboard`,
      3000,
    ),
  );

  // 2 — Coach athletes list
  results.push(
    await capture(page, "02-coach-athletes.png", `${BASE_URL}/athletes`, 2500),
  );

  // 3 — Coach chat with review athlete
  results.push(
    await capture(
      page,
      "03-coach-chat.png",
      `${BASE_URL}/chat/${REVIEW.athleteId}`,
      3000,
    ),
  );

  // 4 — Coach program overview
  results.push(
    await capture(
      page,
      "04-coach-program.png",
      `${BASE_URL}/programs/${REVIEW.blockId}`,
      3000,
    ),
  );

  await page.evaluate(() => localStorage.clear());
  await context.clearCookies();

  // Athlete flow
  await loginAs(page, supabase, REVIEW.athleteEmail);

  // 5 — Athlete dashboard
  results.push(
    await capture(
      page,
      "05-athlete-dashboard.png",
      `${BASE_URL}/dashboard`,
      3000,
    ),
  );

  // 6 — Athlete program week (logging)
  results.push(
    await capture(
      page,
      "06-athlete-program-week.png",
      `${BASE_URL}/programs/${REVIEW.blockId}/weeks/${REVIEW.weekId}`,
      3500,
    ),
  );

  // 7 — Athlete chat
  results.push(
    await capture(
      page,
      "07-athlete-chat.png",
      `${BASE_URL}/chat/${REVIEW.coachId}`,
      3000,
    ),
  );

  // 8 — Profile / settings
  results.push(
    await capture(page, "08-athlete-profile.png", `${BASE_URL}/profile`, 2500),
  );

  // 9 — Statistics (optional premium screen)
  results.push(
    await capture(
      page,
      "09-athlete-statistics.png",
      `${BASE_URL}/data`,
      3000,
    ),
  );

  await browser.close();

  const manifest = {
    baseUrl: BASE_URL,
    device: "iPhone 14 Pro Max (6.7\")",
    expectedPixels: "1290×2796",
    capturedAt: new Date().toISOString(),
    reviewAccounts: {
      coach: REVIEW.coachEmail,
      athlete: REVIEW.athleteEmail,
    },
    uploadTo: "App Store Connect → iPhone 6.7\" Display",
    results,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\n${failed.length} screenshot(s) failed.`);
    process.exit(1);
  }

  console.log(`\nSaved ${results.length} App Store screenshots to ${OUT_DIR}`);
  console.log("Upload folder in App Store Connect → App → Previews and Screenshots → 6.7\"");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
