import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isCronAuthorized } from "@/lib/cronAuth";

async function runBroadcastsCron() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) {
    return NextResponse.json({ error: "Missing service role key" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const now = new Date().toISOString();

  const { data: due } = await admin
    .from("scheduled_chat_broadcasts")
    .select("*")
    .is("sent_at", null)
    .lte("scheduled_at", now);

  let processed = 0;

  for (const row of due || []) {
    const athleteIds = Array.isArray(row.athlete_ids)
      ? (row.athlete_ids as string[])
      : null;

    let athleteQuery = admin
      .from("profiles")
      .select("id")
      .eq("role", "atleet")
      .eq("coach_id", row.coach_id);

    if (athleteIds?.length) {
      athleteQuery = athleteQuery.in("id", athleteIds);
    }

    const { data: athletes } = await athleteQuery;
    if (!athletes?.length) continue;

    const messages = athletes.map((athlete) => ({
      sender_id: row.coach_id,
      receiver_id: athlete.id,
      body: String(row.message).trim(),
      read_at: null,
    }));

    const { error } = await admin.from("messages").insert(messages);
    if (error) continue;

    if (row.repeat_rule === "weekly") {
      const next = new Date(row.scheduled_at);
      next.setDate(next.getDate() + 7);
      await admin.from("scheduled_chat_broadcasts").insert({
        coach_id: row.coach_id,
        message: row.message,
        scheduled_at: next.toISOString(),
        repeat_rule: row.repeat_rule,
        athlete_ids: row.athlete_ids,
      });
    }

    await admin
      .from("scheduled_chat_broadcasts")
      .update({ sent_at: now })
      .eq("id", row.id);

    processed += 1;
  }

  return NextResponse.json({ processed });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runBroadcastsCron();
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runBroadcastsCron();
}
