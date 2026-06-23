#!/usr/bin/env node
/**
 * UI audit: login + screenshot + console/network checks per page.
 * Usage: node scripts/e2e-ui-audit.mjs
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const BASE = "https://limitlesscoaching.app";
const PAGES = [
  "/dashboard",
  "/todo",
  "/merch",
  "/athletes",
  "/chat",
  "/programs",
  "/agenda",
  "/kennisbank",
];

const OUT_DIR = join(process.cwd(), "public/e2e-audit");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

async function login(page, env) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);

  const email = env.E2E_DEMO_EMAIL;
  const password = env.E2E_DEMO_PASSWORD;

  if (email && password) {
    await page.getByPlaceholder("jij@email.nl").fill(email);
    await page.getByPlaceholder("••••••••").fill(password);
    await page.getByRole("button", { name: "Inloggen" }).click();
    await page.waitForURL(/\/(dashboard|intake)/, { timeout: 30000 });
  } else {
    console.log("No E2E_DEMO_* in .env.local — using Demo account button");
    await page.getByRole("button", { name: /Demo account/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  }
}

async function auditViewport(page, viewport, label, report) {
  await page.setViewportSize(viewport);

  for (const path of PAGES) {
    const key = `${path.replace(/\//g, "")}-${label}`;
    const consoleErrors = [];
    const pageErrors = [];

    const onConsole = (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    };
    const onPageError = (err) => pageErrors.push(String(err));

    page.on("console", onConsole);
    page.on("pageerror", onPageError);

    const start = Date.now();
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(3000);

      const stillLoading = await page
        .locator('[class*="animate-pulse"], [class*="Skeleton"], text=/Laden|Loading/i')
        .count();
      const bodyText = await page.locator("body").innerText().catch(() => "");
      const hasErrorState =
        /something went wrong|application error|404|niet gevonden/i.test(bodyText);

      const screenshotPath = join(OUT_DIR, `${key}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const buttons = await page.locator("button:visible, a[role='button']:visible").all();
      const deadButtons = [];
      for (const btn of buttons.slice(0, 12)) {
        const text = (await btn.innerText().catch(() => "")).trim().slice(0, 40);
        const disabled = await btn.isDisabled().catch(() => false);
        const href = await btn.getAttribute("href").catch(() => null);
        if (!disabled && !href && text) {
          deadButtons.push(text);
        }
      }

      report.pages.push({
        path,
        viewport: label,
        loadMs: Date.now() - start,
        consoleErrors: [...new Set(consoleErrors)],
        pageErrors: [...new Set(pageErrors)],
        stillLoadingCount: stillLoading,
        hasErrorState,
        deadButtonSamples: deadButtons.slice(0, 5),
        screenshot: `/e2e-audit/${key}.png`,
      });
    } catch (err) {
      report.pages.push({
        path,
        viewport: label,
        error: String(err),
        consoleErrors: [...new Set(consoleErrors)],
        pageErrors: [...new Set(pageErrors)],
      });
    }

    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const env = loadEnvLocal();
  const report = { base: BASE, loginMethod: env.E2E_DEMO_EMAIL ? "credentials" : "demo-button", pages: [] };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page, env);
    await auditViewport(page, { width: 1440, height: 900 }, "desktop", report);
    await auditViewport(page, { width: 390, height: 844 }, "mobile", report);
  } finally {
    await browser.close();
  }

  writeFileSync(join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
