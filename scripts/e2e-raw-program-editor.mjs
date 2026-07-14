#!/usr/bin/env node
/**
 * E2E tests for coach raw program grid (desktop).
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local for magic-link login.
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.SCREENSHOT_BASE_URL || "http://localhost:3456";
const COACH_EMAIL = process.env.E2E_COACH_EMAIL || "daan@coach.com";

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
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
}

async function findRawProgramWeekUrl(supabase, coachUserId) {
  const { data: athletes } = await supabase
    .from("profiles")
    .select("id")
    .eq("coach_id", coachUserId)
    .limit(50);

  const athleteIds = (athletes || []).map((athlete) => athlete.id);

  let blocks = [];

  if (athleteIds.length > 0) {
    const { data } = await supabase
      .from("program_blocks")
      .select("id, athlete_id")
      .in("athlete_id", athleteIds)
      .limit(20);
    blocks = data || [];
  }

  if (blocks.length === 0) {
    const { data } = await supabase
      .from("program_blocks")
      .select("id, athlete_id")
      .eq("created_by", coachUserId)
      .limit(20);
    blocks = data || [];
  }

  if (blocks.length === 0) {
    const { data } = await supabase
      .from("program_blocks")
      .select("id, athlete_id")
      .limit(20);
    blocks = data || [];
  }

  if (!blocks.length) throw new Error("No program blocks found");

  for (const block of blocks) {
    const { data: weeks } = await supabase
      .from("program_weeks")
      .select("id")
      .eq("program_block_id", block.id)
      .order("week_number", { ascending: true })
      .limit(1);
    if (weeks?.[0]?.id) {
      const athleteQuery = block.athlete_id
        ? `?athlete=${block.athlete_id}&view=raw`
        : "?view=raw";
      return `/programs/${block.id}/weeks/${weeks[0].id}${athleteQuery}`;
    }
  }
  throw new Error("No program week found");
}

async function openRawProgramWeek(page, supabase, coachUserId) {
  const rawPath = await findRawProgramWeekUrl(supabase, coachUserId);
  await page.goto(`${BASE_URL}${rawPath}`, { waitUntil: "networkidle" });
  await page.locator(".coach-program-raw-editor").waitFor({ timeout: 45000 });
}

async function getCell(page, row, colKey = "name") {
  return page.locator(`[data-row-index="${row}"][data-col-key="${colKey}"]`).first();
}

async function selectCell(page, row, colKey = "name") {
  const cell = await getCell(page, row, colKey);
  await cell.click();
  return cell;
}

async function typeIntoSelectedCell(page, text) {
  await page.keyboard.type(text, { delay: 20 });
}

async function cellDisplayText(page, row, colKey = "name") {
  const cell = await getCell(page, row, colKey);
  const display = cell.locator(".coach-program-raw-cell-display");
  if (await display.count()) {
    return (await display.innerText()).trim();
  }
  const input = cell.locator("input, textarea");
  if (await input.count()) {
    return await input.inputValue();
  }
  return "";
}

async function waitForCellValue(page, row, expected, colKey = "name", timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await cellDisplayText(page, row, colKey);
    if (value.toLowerCase().includes(expected.toLowerCase())) return value;
    await page.waitForTimeout(250);
  }
  throw new Error(
    `Cell [${row}, ${colKey}] expected "${expected}" but got "${await cellDisplayText(page, row, colKey)}"`,
  );
}

async function dispatchPaste(page, text) {
  await page.evaluate((value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    window.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  }, text);
}

async function main() {
  loadEnv();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env for E2E login");
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  const stamp = Date.now();
  const exerciseName = `e2e bench ${stamp}`;
  const pastedName = `e2e pasted ${stamp}`;

  try {
    await loginAs(page, supabase, COACH_EMAIL);
    const session = await getSessionForEmail(supabase, COACH_EMAIL);
    await openRawProgramWeek(page, supabase, session.user.id);

    // Find an empty name cell (row with placeholder)
    let targetRow = -1;
    for (let row = 0; row < 15; row += 1) {
      const cell = await getCell(page, row, "name");
      if (!(await cell.count())) continue;
      const text = await cellDisplayText(page, row, "name");
      if (!text || text.includes("Nieuwe oefening")) {
        targetRow = row;
        break;
      }
    }
    if (targetRow === -1) throw new Error("No empty name cell found");

    // Type new exercise
    await selectCell(page, targetRow, "name");
    await page.keyboard.type(exerciseName, { delay: 15 });
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    await waitForCellValue(page, targetRow, exerciseName, "name");
    await page.waitForTimeout(2000);

    // Re-locate row in case insert shifted indices
    for (let row = 0; row < 20; row += 1) {
      const name = await cellDisplayText(page, row, "name");
      if (name.includes(exerciseName)) {
        targetRow = row;
        break;
      }
    }

    // Edit existing cell — sets
    await selectCell(page, targetRow, "sets");
    await page.keyboard.press("F2");
    await page.waitForTimeout(200);
    await page.keyboard.type("3", { delay: 20 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    await waitForCellValue(page, targetRow, "3", "sets");

    // Paste into name cell on next empty row
    let pasteRow = targetRow + 1;
    for (let row = pasteRow; row < pasteRow + 5; row += 1) {
      const text = await cellDisplayText(page, row, "name");
      if (!text || text.includes("Nieuwe oefening")) {
        pasteRow = row;
        break;
      }
    }
    await selectCell(page, pasteRow, "name");
    await page.waitForTimeout(300);
    await dispatchPaste(page, pastedName);
    await waitForCellValue(page, pasteRow, pastedName, "name", 20000);
    await page.waitForTimeout(3000);
    await waitForCellValue(page, pasteRow, pastedName, "name");

    // Value persists after wait (no TTL flash)
    await page.waitForTimeout(6000);
    await waitForCellValue(page, targetRow, exerciseName, "name");

    // Copy / paste roundtrip on sets column
    await selectCell(page, targetRow, "sets");
    const setsValue = await cellDisplayText(page, targetRow, "sets");
    await selectCell(page, pasteRow, "sets");
    await dispatchPaste(page, setsValue);
    await waitForCellValue(page, pasteRow, setsValue, "sets", 20000);

    // Reload and verify persistence
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".coach-program-raw-editor").waitFor({ timeout: 30000 });

    let foundExercise = false;
    let foundPaste = false;
    for (let row = 0; row < 20; row += 1) {
      const name = await cellDisplayText(page, row, "name");
      if (name.toLowerCase().includes(exerciseName.toLowerCase())) foundExercise = true;
      if (name.toLowerCase().includes(pastedName.toLowerCase())) foundPaste = true;
    }

    if (!foundExercise) throw new Error(`Exercise "${exerciseName}" not found after reload`);
    if (!foundPaste) throw new Error(`Pasted "${pastedName}" not found after reload`);

    console.log("Raw program editor E2E passed.");
    if (errors.length > 0) {
      console.warn("Non-fatal console errors:", errors.slice(0, 5));
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
