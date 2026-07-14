import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.SCREENSHOT_BASE_URL || "https://limitlesscoaching.app";
const ATHLETE_EMAIL = process.env.E2E_ATHLETE_EMAIL || "henk@henk.com";
const OUT_DIR = path.resolve("public/e2e-athlete-dashboard-desktop");

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
  return verified.session;
}

async function loginAs(page, supabase, email) {
  const session = await getSessionForEmail(supabase, email);
  const storageKey = getSupabaseStorageKey();

  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, payload }) => {
      localStorage.setItem(key, JSON.stringify(payload));
      localStorage.setItem("theme", "dark");
    },
    {
      key: storageKey,
      payload: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      },
    },
  );
}

function runLayoutChecks() {
  const root = document.querySelector(".premium-athlete-ui");
  const cockpit = document.querySelector(".athlete-dashboard-cockpit");
  if (!cockpit) {
    return { hasPremiumRoot: Boolean(root), hasCockpit: false };
  }

  const kpiRow = cockpit.querySelector(".athlete-dashboard-kpi-row");
  const kpiCards = cockpit.querySelectorAll(".dashboard-kpi-card--v2");
  const kpiSlots = cockpit.querySelectorAll(".athlete-dashboard-kpi-slot");
  const sidebar = document.querySelector(".athlete-app-sidebar");
  const inbox = cockpit.querySelector(".athlete-inbox-panel");
  const cta = cockpit.querySelector(".athlete-dashboard-cockpit-cta");
  const goals = cockpit.querySelector(".athlete-dashboard-cockpit-goals");
  const todos = cockpit.querySelector(".athlete-dashboard-cockpit-todos");
  const agenda = cockpit.querySelector(".athlete-dashboard-cockpit-agenda");
  const appPills = cockpit.querySelectorAll(".athlete-dashboard-app-pill");
  const searchCenter = document.querySelector(".shell-topbar-search-center");
  const greeting = document.querySelector(".shell-topbar-athlete-greeting-hey");
  const startBtn = cockpit.querySelector(".athlete-dashboard-start-btn");
  const strayMobileCta = cockpit.querySelector(".athlete-dashboard-cta-btn");

  const cockpitVisible = getComputedStyle(cockpit).display !== "none";
  const sidebarVisible = sidebar
    ? getComputedStyle(sidebar).display !== "none"
    : false;
  const searchVisible = searchCenter
    ? getComputedStyle(searchCenter).display !== "none"
    : false;

  const kpiColumnsRaw = kpiRow
    ? getComputedStyle(kpiRow).gridTemplateColumns
    : "";
  const kpiRowColumns = /repeat\(\s*5/i.test(kpiColumnsRaw)
    ? 5
    : kpiColumnsRaw.split(" ").filter(Boolean).length;

  return {
    hasPremiumRoot: Boolean(root),
    hasCockpit: true,
    cockpitVisible,
    kpiCount: kpiCards.length + kpiSlots.length,
    hasSidebar: sidebarVisible,
    hasInbox: Boolean(inbox),
    hasCta: Boolean(cta),
    hasGoals: Boolean(goals),
    hasTodos: Boolean(todos),
    hasAgenda: Boolean(agenda),
    appPillCount: appPills.length,
    hasSearchCenter: searchVisible,
    hasGreeting: Boolean(greeting?.textContent?.includes("Hey")),
    startBtnText: startBtn?.textContent?.trim() || "",
    hasStrayMobileCta: Boolean(strayMobileCta),
    kpiRowColumns,
  };
}

async function main() {
  loadEnv();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env vars");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });
  const page = await context.newPage();

  await loginAs(page, supabase, ATHLETE_EMAIL);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const checks = await page.evaluate(runLayoutChecks);
  await page.screenshot({ path: path.join(OUT_DIR, "dashboard-dark.png"), fullPage: false });

  const report = {
    url: `${BASE_URL}/dashboard`,
    email: ATHLETE_EMAIL,
    viewport: "1440x900",
    checks,
    pass:
      checks.hasPremiumRoot &&
      checks.hasCockpit &&
      checks.cockpitVisible &&
      checks.kpiCount === 5 &&
      checks.kpiRowColumns === 5 &&
      checks.hasSidebar &&
      checks.hasInbox &&
      checks.hasCta &&
      checks.hasGoals &&
      checks.hasTodos &&
      checks.hasAgenda &&
      checks.appPillCount === 6 &&
      !checks.hasSearchCenter &&
      checks.hasGreeting &&
      !checks.hasStrayMobileCta &&
      checks.startBtnText.includes("Start invullen"),
  };

  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));

  await browser.close();

  if (!report.pass) {
    console.error("Athlete dashboard desktop E2E FAILED", report);
    process.exit(1);
  }

  console.log("Athlete dashboard desktop E2E PASSED", report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
