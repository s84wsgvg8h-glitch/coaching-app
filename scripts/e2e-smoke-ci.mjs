#!/usr/bin/env node
/**
 * Combined production smoke checks after deploy.
 */
import { spawn } from "node:child_process";
import path from "node:path";

const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const scripts = [
  "verify-ios-release.mjs",
  ...(hasSupabaseEnv
    ? [
        "e2e-athlete-dashboard-desktop.mjs",
        "e2e-coach-dashboard-dark.mjs",
        "e2e-coach-dashboard-light.mjs",
      ]
    : []),
];

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [path.join("scripts", script)], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${script} failed with code ${code}`));
    });
  });
}

async function main() {
  if (!hasSupabaseEnv) {
    console.log(
      "Skipping dashboard e2e: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in CI secrets.",
    );
  }
  for (const script of scripts) {
    console.log(`\n=== Running ${script} ===`);
    await run(script);
  }
  console.log("\nAll smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
