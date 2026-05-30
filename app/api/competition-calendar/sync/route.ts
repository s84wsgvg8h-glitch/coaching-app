import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { insertCalendarSyncLog } from "@/lib/calendarSyncLog";
import {
  fetchKnkfCalendarEvents,
  syncKnkfEventsToSupabase,
} from "@/lib/knkfCalendarSync";

function getSupabaseForRequest(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase is niet geconfigureerd.");
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  return createClient(url, anonKey, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
}

async function assertCoachAccess(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const cronHeader =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (cronSecret && cronHeader === cronSecret) {
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceRole && url) {
      return { supabase: createClient(url, serviceRole), error: null };
    }
  }

  const supabase = getSupabaseForRequest(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase: null, error: "Niet ingelogd." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "coach" && profile?.role !== "admin") {
    return { supabase: null, error: "Alleen coaches mogen de kalender synchroniseren." };
  }

  return { supabase, error: null };
}

async function getTriggerUserId(request: Request, supabase: NonNullable<Awaited<ReturnType<typeof assertCoachAccess>>["supabase"]>) {
  const cronSecret = process.env.CRON_SECRET;
  const cronHeader =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (cronSecret && cronHeader === cronSecret) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function POST(request: Request) {
  let triggeredBy: string | null = null;
  let supabaseClient: Awaited<ReturnType<typeof assertCoachAccess>>["supabase"] = null;

  try {
    const access = await assertCoachAccess(request);

    if (!access.supabase) {
      return NextResponse.json({ error: access.error }, { status: 401 });
    }

    supabaseClient = access.supabase;
    triggeredBy = await getTriggerUserId(request, access.supabase);

    const events = await fetchKnkfCalendarEvents();
    const result = await syncKnkfEventsToSupabase(access.supabase, events);

    await insertCalendarSyncLog(access.supabase, {
      triggeredBy,
      status: "success",
      fetchedCount: result.fetched,
      insertedCount: result.inserted,
      skippedCount: result.skipped,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Synchronisatie mislukt.";

    if (supabaseClient) {
      await insertCalendarSyncLog(supabaseClient, {
        triggeredBy,
        status: "error",
        fetchedCount: 0,
        insertedCount: 0,
        skippedCount: 0,
        errorMessage: message,
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  let supabaseClient: Awaited<ReturnType<typeof assertCoachAccess>>["supabase"] = null;
  let triggeredBy: string | null = null;

  try {
    const cronSecret = process.env.CRON_SECRET;
    const cronHeader = request.headers.get("authorization");

    if (
      cronSecret &&
      cronHeader === `Bearer ${cronSecret}`
    ) {
      const access = await assertCoachAccess(request);

      if (!access.supabase) {
        return NextResponse.json({ error: access.error }, { status: 401 });
      }

      supabaseClient = access.supabase;
      triggeredBy = await getTriggerUserId(request, access.supabase);
      const events = await fetchKnkfCalendarEvents();
      const result = await syncKnkfEventsToSupabase(access.supabase, events);

      await insertCalendarSyncLog(access.supabase, {
        triggeredBy,
        status: "success",
        fetchedCount: result.fetched,
        insertedCount: result.inserted,
        skippedCount: result.skipped,
      });

      return NextResponse.json(result);
    }

    const events = await fetchKnkfCalendarEvents();
    return NextResponse.json({ events, count: events.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "KNKF kalender ophalen mislukt.";

    if (supabaseClient) {
      await insertCalendarSyncLog(supabaseClient, {
        triggeredBy,
        status: "error",
        fetchedCount: 0,
        insertedCount: 0,
        skippedCount: 0,
        errorMessage: message,
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
