#!/usr/bin/env node
/**
 * Verify App Store review demo accounts can sign in and load key data.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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

function pass(label, ok, detail = "") {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

async function verifyRole(client, expectedRole) {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return false;

  const { data: profile } = await client
    .from("profiles")
    .select("role, pending_kind, intake_completed_at, coach_id")
    .eq("id", user.id)
    .maybeSingle();

  return (
    profile?.role === expectedRole &&
    profile?.pending_kind == null &&
    (expectedRole !== "atleet" || profile?.intake_completed_at)
  );
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const coachEmail =
    process.env.REVIEW_COACH_EMAIL || "review-coach@limitlesscoaching.app";
  const coachPassword =
    process.env.REVIEW_COACH_PASSWORD || "ReviewCoach2026!";
  const athleteEmail =
    process.env.REVIEW_ATHLETE_EMAIL || "review-athlete@limitlesscoaching.app";
  const athletePassword =
    process.env.REVIEW_ATHLETE_PASSWORD || "ReviewAthlete2026!";

  let allOk = true;

  // Coach
  const coachClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: coachLoginError } = await coachClient.auth.signInWithPassword({
    email: coachEmail,
    password: coachPassword,
  });
  allOk =
    pass("Coach login", !coachLoginError, coachLoginError?.message) && allOk;
  allOk = pass("Coach profile active", await verifyRole(coachClient, "coach")) && allOk;

  const { count: athleteCount } = await coachClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "atleet")
    .eq("coach_id", (await coachClient.auth.getUser()).data.user?.id ?? "");

  allOk = pass("Coach sees linked athlete", (athleteCount ?? 0) >= 1) && allOk;

  await coachClient.auth.signOut();

  // Athlete
  const athleteClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: athleteLoginError } = await athleteClient.auth.signInWithPassword({
    email: athleteEmail,
    password: athletePassword,
  });
  allOk =
    pass("Athlete login", !athleteLoginError, athleteLoginError?.message) && allOk;
  allOk =
    pass("Athlete profile active", await verifyRole(athleteClient, "atleet")) && allOk;

  const athleteId = (await athleteClient.auth.getUser()).data.user?.id;
  const { count: blockCount } = await athleteClient
    .from("program_blocks")
    .select("id", { count: "exact", head: true })
    .eq("athlete_id", athleteId ?? "");

  allOk = pass("Athlete has program block", (blockCount ?? 0) >= 1) && allOk;

  const { count: messageCount } = await athleteClient
    .from("messages")
    .select("id", { count: "exact", head: true })
    .or(`sender_id.eq.${athleteId},receiver_id.eq.${athleteId}`);

  allOk = pass("Athlete has chat messages", (messageCount ?? 0) >= 1) && allOk;

  await athleteClient.auth.signOut();

  if (!allOk) {
    console.error("\nReview demo verification FAILED. Run: npm run create:app-review-demo");
    process.exit(1);
  }

  console.log("\nReview demo verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
