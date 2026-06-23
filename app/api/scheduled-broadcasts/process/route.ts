import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { broadcastMessageToAthletes } from "@/lib/chatBroadcast";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: due } = await client
    .from("scheduled_chat_broadcasts")
    .select("*")
    .eq("coach_id", user.id)
    .is("sent_at", null)
    .lte("scheduled_at", now);

  let processed = 0;

  for (const row of due || []) {
    const result = await broadcastMessageToAthletes(user.id, row.message);
    if (!result.error) {
      await client
        .from("scheduled_chat_broadcasts")
        .update({ sent_at: now })
        .eq("id", row.id);
      processed += 1;
    }
  }

  return NextResponse.json({ processed });
}
