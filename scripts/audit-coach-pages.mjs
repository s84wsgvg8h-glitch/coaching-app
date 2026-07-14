import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL =
  process.env.SCREENSHOT_BASE_URL || "https://limitlesscoaching.app";
const COACH_EMAIL = "daan@austerlitz.nl";

const COACH_ROUTES = [
  "/dashboard",
  "/kennisbank",
  "/agenda",
  "/wedstrijd-kalender",
  "/data",
  "/leaderboard",
  "/oefeningenbibliotheek",
  "/betalingen",
  "/organisatie",
  "/merch",
  "/limitless-data",
  "/profile",
  "/profile?section=settings",
  "/chat",
  "/athletes",
  "/programs",
  "/todo",
  "/planning",
  "/video-review",
];

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
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
const pageErrors = [];

page.on("console", (msg) => {
  if (msg.type() === "error") {
    consoleErrors.push({ text: msg.text() });
  }
});

page.on("pageerror", (err) => {
  pageErrors.push({ message: err.message });
});

await loginAs(page, supabase, COACH_EMAIL);

const results = [];

for (const route of COACH_ROUTES) {
  const url = `${BASE_URL}${route}`;
  const routeConsoleBefore = consoleErrors.length;
  const routePageBefore = pageErrors.length;

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);

    const finalUrl = page.url();
    const bodyText = await page.locator("body").innerText();
    const title = await page.title();

    const issues = [];

    if (finalUrl.includes("/login")) issues.push("redirected_to_login");
    if (bodyText.includes("Onderhoud") || bodyText.includes("maintenance"))
      issues.push("maintenance_mode");
    if (bodyText.match(/laden\.\.\.|Laden\.\.\.|loading/i) && bodyText.length < 500)
      issues.push("stuck_loading");
    if (bodyText.includes("Profiel niet gevonden")) issues.push("profile_not_found");
    if (bodyText.includes("Geen toegang")) issues.push("no_access");
    if (bodyText.includes("Er ging iets mis")) issues.push("generic_error");
    if (bodyText.includes("Niet ingelogd")) issues.push("not_logged_in");

    const newConsole = consoleErrors.slice(routeConsoleBefore);
    const newPage = pageErrors.slice(routePageBefore);

    results.push({
      route,
      finalUrl: finalUrl.replace(BASE_URL, ""),
      title,
      issues,
      bodySnippet: bodyText.slice(0, 300).replace(/\s+/g, " "),
      consoleErrors: newConsole.map((e) => e.text).slice(0, 5),
      pageErrors: newPage.map((e) => e.message).slice(0, 3),
    });
  } catch (error) {
    results.push({
      route,
      finalUrl: page.url().replace(BASE_URL, ""),
      title: "",
      issues: ["navigation_timeout"],
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

console.log(JSON.stringify(results, null, 2));

await browser.close();
