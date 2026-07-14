import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isCronAuthorized } from "@/lib/cronAuth";
import { detectAndInsertPeriodizationAlerts } from "@/lib/periodizationAlerts";

async function runPeriodizationAlertsCron() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: coaches } = await admin
    .from("profiles")
    .select("id, role")
    .in("role", ["coach", "admin"]);

  let processed = 0;

  for (const coach of coaches || []) {
    await detectAndInsertPeriodizationAlerts(
      coach.id as string,
      coach.role as string,
    );
    processed += 1;
  }

  return NextResponse.json({ processed });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runPeriodizationAlertsCron();
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runPeriodizationAlertsCron();
}
