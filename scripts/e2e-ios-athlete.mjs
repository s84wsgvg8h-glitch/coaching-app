#!/usr/bin/env node
/**
 * Full athlete flow test — WebKit @ iPhone 15 Pro (Safari engine).
 * Logs in as henk@henk.com and validates mobile layouts.
 */
import { webkit, devices } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const BASE = "https://limitlesscoaching.app";
const EMAIL = process.env.E2E_ATHLETE_EMAIL ?? "henk@henk.com";
const PASSWORD = process.env.E2E_ATHLETE_PASSWORD ?? "123456";
const OUT = join(process.cwd(), "public/e2e-ios-athlete");
mkdirSync(OUT, { recursive: true });

const report = [];

function log(section, ok, detail) {
  report.push({ section, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${section}: ${detail}`);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.getByPlaceholder("jij@email.nl").fill(EMAIL);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await page.waitForURL(/\/(dashboard|intake|pending-approval|chat|programs)/, {
    timeout: 45000,
  });
  log("login", true, `→ ${page.url()}`);
}

async function testDashboardBwKeyboard(page) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2000);

  const rootBefore = await page.evaluate(() => {
    const el = document.getElementById("app-viewport-root");
    return el ? el.getBoundingClientRect().height : 0;
  });

  const bwInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
  if ((await bwInput.count()) === 0) {
    log("dashboard-bw", false, "BW input not found");
    return;
  }

  await bwInput.click();
  await page.waitForTimeout(400);

  const rootAfter = await page.evaluate(() => {
    const el = document.getElementById("app-viewport-root");
    return el ? el.getBoundingClientRect().height : 0;
  });

  const delta = Math.abs(rootAfter - rootBefore);
  log("dashboard-bw", delta < 8, `root Δ${delta.toFixed(0)}px (${rootBefore.toFixed(0)}→${rootAfter.toFixed(0)})`);
  await page.screenshot({ path: join(OUT, "dashboard-bw-focus.png"), fullPage: true });
}

async function testTodosQuicklinks(page) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2000);

  const overlap = await page.evaluate(() => {
    const todos = document.querySelector(".athlete-dashboard-todos-widget");
    const quicklinks = document.querySelector(".athlete-dashboard-quicklinks--mobile");
    if (!todos || !quicklinks) return { found: false, overlapPx: 0 };
    const t = todos.getBoundingClientRect();
    const q = quicklinks.getBoundingClientRect();
    return { found: true, overlapPx: Math.max(0, t.bottom - q.top), todosBottom: t.bottom, quickTop: q.top };
  });

  log(
    "todos-quicklinks",
    !overlap.found || overlap.overlapPx < 4,
    overlap.found
      ? `overlap ${overlap.overlapPx.toFixed(0)}px`
      : "selectors missing",
  );
  await page.screenshot({ path: join(OUT, "dashboard-todos.png"), fullPage: true });
}

async function testChatKeyboard(page) {
  await page.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2500);

  const chatRow = page.locator(".chat-list-row").first();
  if ((await chatRow.count()) === 0) {
    log("chat-open", false, "no conversations");
    return;
  }
  await chatRow.click();
  await page.waitForTimeout(2500);

  const compose = page.locator("textarea.chat-message-input");
  if ((await compose.count()) === 0) {
    log("chat-compose", false, "compose missing");
    await page.screenshot({ path: join(OUT, "chat-no-compose.png"), fullPage: true });
    return;
  }

  await compose.click();
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const h = Math.round(window.innerHeight * 0.55);
    document.documentElement.style.setProperty("--keyboard-height", `${h}px`);
    document.documentElement.dataset.keyboardOpen = "true";
    if (window.visualViewport) {
      Object.defineProperty(window.visualViewport, "height", {
        configurable: true,
        get: () => h,
      });
      Object.defineProperty(window.visualViewport, "offsetTop", {
        configurable: true,
        get: () => 0,
      });
      window.visualViewport.dispatchEvent(new Event("resize"));
    }
  });
  await page.waitForTimeout(350);

  const after = await page.evaluate(() => {
    const header = document.querySelector(".chat-conversation-header, header");
    const composeEl = document.querySelector("textarea.chat-message-input");
    const panel = document.querySelector(".chat-side-panel--viewport-sync, .chat-side-panel");
    const headerR = header?.getBoundingClientRect();
    const composeR = composeEl?.getBoundingClientRect();
    const panelR = panel?.getBoundingClientRect();
    const vvH = window.visualViewport?.height ?? window.innerHeight;
    const kbH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--keyboard-height") || "0",
      10,
    );
    const composeVisible =
      composeR && composeR.height > 20 && composeR.bottom <= vvH + kbH + 2 && composeR.top >= 0;
    return {
      headerTop: headerR?.top ?? null,
      panelH: panelR?.height ?? null,
      panelPb: panel ? getComputedStyle(panel).paddingBottom : null,
      kbH,
      composeVisible,
      composeBottom: composeR?.bottom,
      vvH,
      sync: document.documentElement.getAttribute("data-chat-viewport-sync"),
    };
  });

  log("chat-header", Math.abs((after.headerTop ?? 0) - 0) < 4, `top=${after.headerTop}`);
  log(
    "chat-compose",
    after.composeVisible === true,
    `bottom=${after.composeBottom?.toFixed?.(0)} vv=${after.vvH?.toFixed?.(0)} sync=${after.sync}`,
  );
  await page.screenshot({ path: join(OUT, "chat-keyboard.png"), fullPage: true });
}

async function testLoginLayout(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1000);
  const cardTop = await page.evaluate(() => {
    const card =
      document.querySelector(".auth-shell-card") ??
      document.querySelector(".auth-shell-inner") ??
      document.querySelector("main");
    return card ? card.getBoundingClientRect().top : null;
  });
  log("login-layout", cardTop != null && cardTop < 120, `form top=${cardTop?.toFixed?.(0)}px`);
  await page.screenshot({ path: join(OUT, "login.png"), fullPage: true });
}

async function testDashboardLightMode(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("coaching-app-theme", "light");
  });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  });
  await page.waitForTimeout(2200);

  const checks = await page.evaluate(() => {
    const scroll = document.querySelector(".athlete-dashboard-quicklinks-scroll");
    const scrollStyle = scroll ? getComputedStyle(scroll) : null;
    const segments = document.querySelector(".athlete-dashboard-todos-segments");
    const fillMeta = document.querySelector(".athlete-dashboard-fill-meta");
    const bwMeta = document.querySelector(".athlete-dashboard-bw-meta");
    const todosList = document.querySelector(".athlete-dashboard-todos-list");
    const todosStyle = todosList ? getComputedStyle(todosList) : null;
    const quicklinks = document.querySelector(".athlete-dashboard-quicklinks--mobile");
    const dock = document.querySelector(".athlete-dashboard-bottom-dock");
    const dockRect = dock?.getBoundingClientRect();
    const quickRect = quicklinks?.getBoundingClientRect();
    const tabBar = document.querySelector(".athlete-mobile-tab-bar");
    const tabRect = tabBar?.getBoundingClientRect();
    const gapToTab =
      tabRect && quickRect ? Math.max(0, tabRect.top - quickRect.bottom) : null;
    return {
      quickDisplay: scrollStyle?.display ?? null,
      segmentsGone: !segments,
      fillMetaGone: !fillMeta,
      bwMetaGone: !bwMeta,
      todosLayout: todosStyle?.display ?? null,
      gapToTab,
      cardCount: [...document.querySelectorAll(
        ".athlete-dashboard-quicklinks--mobile .athlete-dashboard-quicknav-card",
      )].filter((el) => el.getBoundingClientRect().width > 0).length,
    };
  });

  log("light-layout-meta", checks.fillMetaGone && checks.bwMetaGone, `fill=${!checks.fillMetaGone} bw=${!checks.bwMetaGone}`);
  log("light-segments", checks.segmentsGone, `segments=${!checks.segmentsGone}`);
  log(
    "light-todos-layout",
    checks.todosLayout === "flex",
    checks.todosLayout ?? "missing",
  );
  log(
    "light-quicknav",
    checks.quickDisplay === "grid" && checks.cardCount === 4,
    `${checks.quickDisplay} cards=${checks.cardCount}`,
  );
  log(
    "light-quicknav-tab-gap",
    checks.gapToTab != null && checks.gapToTab <= 16,
    `gap=${checks.gapToTab?.toFixed?.(0) ?? "?"}px`,
  );
  await page.screenshot({ path: join(OUT, "dashboard-light-final.png"), fullPage: true });
}

async function testDashboardDarkLayout(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("coaching-app-theme", "dark");
  });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(OUT, "dashboard-dark-final.png"), fullPage: true });

  const checks = await page.evaluate(() => {
    const segments = document.querySelector(".athlete-dashboard-todos-segments");
    const fillMeta = document.querySelector(".athlete-dashboard-fill-meta");
    const bwMeta = document.querySelector(".athlete-dashboard-bw-meta");
    const quicklinks = document.querySelector(".athlete-dashboard-quicklinks--mobile");
    const quickRect = quicklinks?.getBoundingClientRect();
    const tabBar = document.querySelector(".athlete-mobile-tab-bar");
    const tabRect = tabBar?.getBoundingClientRect();
    return {
      segmentsGone: !segments,
      fillMetaGone: !fillMeta,
      bwMetaGone: !bwMeta,
      gapToTab:
        tabRect && quickRect ? Math.max(0, tabRect.top - quickRect.bottom) : null,
    };
  });

  log("dark-layout-meta", checks.fillMetaGone && checks.bwMetaGone, "ok");
  log("dark-segments", checks.segmentsGone, "ok");
  log(
    "dark-quicknav-tab-gap",
    checks.gapToTab != null && checks.gapToTab <= 16,
    `gap=${checks.gapToTab?.toFixed?.(0) ?? "?"}px`,
  );
}

async function main() {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 15 Pro"],
    locale: "nl-NL",
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  try {
    await testLoginLayout(page);
    await login(page);
    await testDashboardBwKeyboard(page);
    await testTodosQuicklinks(page);
    await testDashboardDarkLayout(page);
    await testDashboardLightMode(page);
    await testChatKeyboard(page);
  } catch (err) {
    log("fatal", false, String(err));
    await page.screenshot({ path: join(OUT, "fatal.png"), fullPage: true }).catch(() => {});
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  const failed = report.filter((r) => !r.ok).length;
  console.log(`\n${report.length - failed}/${report.length} passed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main();
