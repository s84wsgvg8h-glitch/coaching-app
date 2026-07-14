#!/usr/bin/env node
/**
 * Create App Store review demo accounts (coach + athlete) with sample data.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage:
 *   node scripts/create-app-review-demo.mjs
 *   REVIEW_COACH_EMAIL=... REVIEW_COACH_PASSWORD=... node scripts/create-app-review-demo.mjs
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

async function ensureUser(admin, { email, password, fullName, role, coachId = null }) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) throw listError;

  const existing = listed.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  let userId = existing?.id;

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !created.user) {
      throw createError || new Error(`Kon ${email} niet aanmaken.`);
    }

    userId = created.user.id;
    console.log(`Created auth user: ${email}`);
  } else {
    console.log(`Auth user exists: ${email}`);
    await admin.auth.admin.updateUserById(userId, { password });
  }

  const now = new Date().toISOString();
  const profilePatch =
    role === "atleet"
      ? {
          id: userId,
          full_name: fullName,
          role,
          coach_id: coachId,
          pending_kind: null,
          intake_required: false,
          intake_completed_at: now,
        }
      : {
          id: userId,
          full_name: fullName,
          role,
          coach_id: null,
          pending_kind: null,
          intake_required: false,
        };

  const { error: profileError } = await admin.from("profiles").upsert(profilePatch);

  if (profileError) throw profileError;

  return userId;
}

async function seedDemoProgram(admin, coachId, athleteId) {
  const { data: existingBlocks, error: listError } = await admin
    .from("program_blocks")
    .select("id, title")
    .eq("athlete_id", athleteId)
    .limit(1);

  if (listError) throw listError;

  if (existingBlocks?.length) {
    const blockId = existingBlocks[0].id;
    const { data: week } = await admin
      .from("program_weeks")
      .select("id")
      .eq("program_block_id", blockId)
      .order("week_number", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (week) {
      const { data: day } = await admin
        .from("program_days")
        .select("id")
        .eq("program_week_id", week.id)
        .order("day_number", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (day) {
        const { count } = await admin
          .from("program_exercises")
          .select("id", { count: "exact", head: true })
          .eq("program_day_id", day.id);

        if ((count ?? 0) === 0) {
          await insertDemoExercises(admin, day.id);
          console.log("Completed demo exercises on existing program");
        } else {
          console.log(`Demo program exists: ${existingBlocks[0].title}`);
        }
        return blockId;
      }
    }
  }

  const startDate = new Date().toISOString().slice(0, 10);

  const { data: block, error: blockError } = await admin
    .from("program_blocks")
    .insert({
      title: "App Review — Week 1",
      description: "Demo training block for App Store review.",
      created_by: coachId,
      athlete_id: athleteId,
      start_date: startDate,
    })
    .select("id")
    .single();

  if (blockError || !block) throw blockError || new Error("Kon program block niet aanmaken.");

  const { data: week, error: weekError } = await admin
    .from("program_weeks")
    .insert({
      title: "Week 1",
      week_number: 1,
      program_block_id: block.id,
    })
    .select("id")
    .single();

  if (weekError || !week) throw weekError || new Error("Kon program week niet aanmaken.");

  const { data: day, error: dayError } = await admin
    .from("program_days")
    .insert({
      title: "Dag 1 — Squat focus",
      day_number: 1,
      program_week_id: week.id,
      scheduled_date: startDate,
      warmup: "5 min fiets + mobiliteit heupen/knieën",
      notes: "Demo dag voor App Store review — log sets en RPE.",
    })
    .select("id")
    .single();

  if (dayError || !day) throw dayError || new Error("Kon program day niet aanmaken.");

  await insertDemoExercises(admin, day.id);

  console.log("Created demo program block + week + day + exercises");
  return block.id;
}

async function insertDemoExercises(admin, dayId) {
  const { error: exercisesError } = await admin.from("program_exercises").insert([
    {
      program_day_id: dayId,
      exercise_number: 1,
      name: "Squat",
      sets: "3",
      reps: "5",
      load: "100 kg",
      rpe: "7",
      exercise_priority: "primary",
      notes: "Focus op diepte en bracing.",
    },
    {
      program_day_id: dayId,
      exercise_number: 2,
      name: "Bench Press",
      sets: "3",
      reps: "8",
      load: "70 kg",
      rpe: "7",
      exercise_priority: "secondary",
    },
    {
      program_day_id: dayId,
      exercise_number: 3,
      name: "Romanian Deadlift",
      sets: "3",
      reps: "10",
      load: "80 kg",
      rpe: "6",
      exercise_priority: "tertiary",
    },
  ]);

  if (exercisesError) throw exercisesError;
}

async function seedWelcomeChat(admin, coachId, athleteId) {
  const { count, error: countError } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .or(
      `and(sender_id.eq.${coachId},receiver_id.eq.${athleteId}),and(sender_id.eq.${athleteId},receiver_id.eq.${coachId})`,
    );

  if (countError) throw countError;

  if ((count ?? 0) > 0) {
    console.log("Demo chat messages already exist");
    return;
  }

  const { error } = await admin.from("messages").insert([
    {
      sender_id: coachId,
      receiver_id: athleteId,
      body: "Welkom bij Limitless Coaching! Dit is je demo programma voor App Store review.",
    },
    {
      sender_id: athleteId,
      receiver_id: coachId,
      body: "Bedankt coach — klaar om te trainen!",
    },
  ]);

  if (error) throw error;
  console.log("Seeded welcome chat messages");
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const coachEmail =
    process.env.REVIEW_COACH_EMAIL || "review-coach@limitlesscoaching.app";
  const coachPassword =
    process.env.REVIEW_COACH_PASSWORD || "ReviewCoach2026!";
  const athleteEmail =
    process.env.REVIEW_ATHLETE_EMAIL || "review-athlete@limitlesscoaching.app";
  const athletePassword =
    process.env.REVIEW_ATHLETE_PASSWORD || "ReviewAthlete2026!";

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const coachId = await ensureUser(admin, {
    email: coachEmail,
    password: coachPassword,
    fullName: "App Review Coach",
    role: "coach",
  });

  const athleteId = await ensureUser(admin, {
    email: athleteEmail,
    password: athletePassword,
    fullName: "App Review Athlete",
    role: "atleet",
    coachId,
  });

  const blockId = await seedDemoProgram(admin, coachId, athleteId);
  await seedWelcomeChat(admin, coachId, athleteId);

  const { data: week } = await admin
    .from("program_weeks")
    .select("id")
    .eq("program_block_id", blockId)
    .order("week_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  const programWeekUrl = week
    ? `https://limitlesscoaching.app/programs/${blockId}/weeks/${week.id}`
    : `https://limitlesscoaching.app/programs/${blockId}`;

  console.log("\nApp Store review demo accounts ready:\n");
  console.log(
    JSON.stringify(
      {
        coach: { email: coachEmail, password: coachPassword, id: coachId },
        athlete: { email: athleteEmail, password: athletePassword, id: athleteId },
        program: { blockId, weekUrl: programWeekUrl },
        urls: {
          coachDashboard: "https://limitlesscoaching.app/dashboard",
          athleteDashboard: "https://limitlesscoaching.app/dashboard",
          athleteProgram: programWeekUrl,
          chat: "https://limitlesscoaching.app/chat",
        },
        notes: [
          "Paste coach credentials in App Store Connect → App Review Information.",
          "Athlete account can test program logging + chat from athlete perspective.",
          "Rotate passwords after App Review completes.",
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
