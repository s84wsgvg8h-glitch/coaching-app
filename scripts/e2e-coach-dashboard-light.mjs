import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.SCREENSHOT_BASE_URL || "https://limitlesscoaching.app";
const COACH_EMAIL = process.env.E2E_COACH_EMAIL || "daan@coach.com";
const OUT_DIR = path.resolve("public/e2e-coach-dashboard-light");

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
      localStorage.setItem("theme", "light");
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

async function main() {
  loadEnv();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env vars in .env.local");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await loginAs(page, supabase, COACH_EMAIL);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);

  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
  });

  await page
    .locator(".premium-coach-ui .dashboard-cockpit")
    .filter({ visible: true })
    .first()
    .waitFor({
      state: "visible",
      timeout: 30000,
    });
  await page.waitForTimeout(1500);

  const screenshotPath = path.join(OUT_DIR, "coach-dashboard-light-desktop.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const checks = await page.evaluate(() => {
    function isVisible(el) {
      if (!el) return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    function findVisible(selector) {
      return (
        Array.from(document.querySelectorAll(selector)).find((el) => isVisible(el)) ??
        null
      );
    }

    function countVisible(selector, root = document) {
      return Array.from(root.querySelectorAll(selector)).filter((el) =>
        isVisible(el),
      ).length;
    }

    const root = findVisible(".premium-coach-ui");
    const cockpit = findVisible(".dashboard-cockpit");
    const scope = cockpit ?? root ?? document;
    const bottom = scope.querySelector(".dashboard-cockpit-bottom");
    const inboxDesktop = scope.querySelector(".dashboard-cockpit-panel--inbox-desktop");
    const alerts = scope.querySelector(".dashboard-cockpit-panel--alerts");
    const quickActions = scope.querySelector(".dashboard-quick-actions--cockpit");
    const quickBtn = quickActions?.querySelector(".dashboard-quick-action-btn");
    const quickGrid = quickActions
      ? getComputedStyle(quickActions).gridTemplateColumns
      : "";
    const bottomHidden = bottom ? !isVisible(bottom) : true;
    const inboxVisible = inboxDesktop ? isVisible(inboxDesktop) : false;
    const alertsHidden = alerts ? !isVisible(alerts) : true;
    const kpiCards = countVisible(".dashboard-kpi-card--v2", scope);
    const kpiAccents = countVisible(".dashboard-kpi-accent", scope);
    const focusRows = countVisible(".dashboard-focus-check-row", scope);
    const urgencyBars = countVisible(
      ".dashboard-focus-check-urgency:not(.dashboard-focus-check-urgency-empty)",
      scope,
    );
    const bg = root ? getComputedStyle(root).backgroundColor : "";
    const card = scope.querySelector(".dashboard-kpi-card");
    const cardBg = card ? getComputedStyle(card).backgroundColor : "";
    const mobileAgenda = findVisible(".coach-mobile-agenda-trigger");
    const mobileAgendaHidden = !mobileAgenda;

    return {
      hasCockpit: Boolean(cockpit),
      bottomHidden,
      inboxVisible,
      alertsHidden,
      quickGrid,
      quickBtnCount:
        quickActions?.querySelectorAll(".dashboard-quick-action-btn").length ?? 0,
      kpiCards,
      kpiAccents,
      focusRows,
      urgencyBars,
      shellBg: bg,
      cardBg,
      quickBtnFlexDir: quickBtn ? getComputedStyle(quickBtn).flexDirection : "",
      mobileAgendaHidden,
    };
  });

  console.log(JSON.stringify({ screenshotPath, checks }, null, 2));

  const failures = [];
  if (!checks.hasCockpit) failures.push("cockpit missing");
  if (!checks.bottomHidden) failures.push("bottom row should be hidden on light desktop");
  if (!checks.inboxVisible) failures.push("desktop inbox panel should be visible");
  if (!checks.alertsHidden) failures.push("alerts panel should be hidden on light desktop");
  if (checks.quickBtnCount !== 4) failures.push("expected 4 quick actions");
  if (checks.kpiCards !== 4) failures.push("expected 4 KPI cards");
  if (checks.kpiAccents !== 4) failures.push("expected accent rail on each KPI card");
  if (checks.quickBtnFlexDir !== "column")
    failures.push("quick actions should stack icon above label");
  if (checks.focusRows > 0 && checks.urgencyBars !== checks.focusRows)
    failures.push("each focus task should have a colored accent bar");
  if (!checks.mobileAgendaHidden)
    failures.push("mobile agenda trigger should be hidden on desktop");

  if (failures.length) {
    console.error("FAIL:", failures.join("; "));
    process.exitCode = 1;
  } else {
    console.log("PASS: coach dashboard light layout checks");
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
