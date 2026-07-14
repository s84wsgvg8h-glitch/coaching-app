#!/usr/bin/env node
/**
 * Pre-release checks for iOS TestFlight / App Store submission.
 * Usage: node scripts/verify-ios-release.mjs
 */

const BASE_URL = process.env.SCREENSHOT_BASE_URL || "https://limitlesscoaching.app";

const ROUTES = [
  "/login",
  "/signup",
  "/privacy",
  "/voorwaarden",
  "/support",
  "/.well-known/apple-app-site-association",
];

async function checkRoute(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const response = await fetch(url, { redirect: "follow" });
    return { path, status: response.status, ok: response.status >= 200 && response.status < 400 };
  } catch (error) {
    return {
      path,
      status: 0,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkAasa() {
  const url = `${BASE_URL}/.well-known/apple-app-site-association`;
  try {
    const response = await fetch(url);
    const text = await response.text();
    const json = JSON.parse(text);
    const appIds = json?.applinks?.details?.flatMap((d) => d.appIDs || []) || [];
    const hasBundle = appIds.some((id) => String(id).includes("app.limitlesscoaching"));
    return {
      ok: response.ok && hasBundle,
      appIds,
      teamHint: appIds[0]?.split(".")[0] || null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      appIds: [],
      teamHint: null,
    };
  }
}

async function main() {
  console.log(`Verifying iOS release prerequisites for ${BASE_URL}\n`);

  const routeResults = await Promise.all(ROUTES.map(checkRoute));
  const aasa = await checkAasa();

  console.log("Routes:");
  for (const result of routeResults) {
    const mark = result.ok ? "PASS" : "FAIL";
    const extra = result.error ? ` (${result.error})` : "";
    console.log(`  [${mark}] ${result.path} → ${result.status}${extra}`);
  }

  console.log("\nApple App Site Association:");
  if (aasa.ok) {
    console.log(`  [PASS] appIDs include app.limitlesscoaching`);
    console.log(`  appIDs: ${aasa.appIds.join(", ")}`);
    if (aasa.teamHint) {
      console.log(`  APPLE_TEAM_ID hint: ${aasa.teamHint}`);
    }
  } else {
    console.log(`  [FAIL] ${aasa.error || "Missing or invalid AASA"}`);
  }

  console.log("\nManual checks (device required):");
  const manual = [
    "Universal link opens app from Safari",
    "Push enable + reminder delivery (APNS_* on Vercel, APNS_USE_SANDBOX=false for TestFlight)",
    "Account deletion: Profiel → Account verwijderen",
    "Chat report/block flow",
    "Camera/video upload in program week",
    "Stripe merch checkout (external browser)",
  ];
  for (const item of manual) {
    console.log(`  [ ] ${item}`);
  }

  console.log("\nDocs:");
  console.log("  docs/ios-testflight.md");
  console.log("  docs/app-store-connect.md");

  const failed =
    routeResults.some((r) => !r.ok) || !aasa.ok;

  if (failed) {
    console.error("\nSome automated checks failed.");
    process.exitCode = 1;
  } else {
    console.log("\nAutomated checks passed. Complete manual device checklist before upload.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
