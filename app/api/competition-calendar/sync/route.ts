import { NextResponse } from "next/server";
import { assertCoachLikeOrCron } from "@/lib/coachApiAuth";
import { insertCalendarSyncLog, getLastSuccessfulCalendarSync } from "@/lib/calendarSyncLog";
import {
  fetchKnkfCalendarEvents,
  syncKnkfEventsToSupabase,
} from "@/lib/knkfCalendarSync";

export async function POST(request: Request) {
  let triggeredBy: string | null = null;
  let supabaseClient: NonNullable<
    Awaited<ReturnType<typeof assertCoachLikeOrCron>>["db"]
  > | null = null;

  try {
    const access = await assertCoachLikeOrCron(request);

    if (!access.db) {
      return NextResponse.json({ error: access.error }, { status: 401 });
    }

    supabaseClient = access.db;
    triggeredBy = access.cron ? null : access.userId;

    const events = await fetchKnkfCalendarEvents();
    const result = await syncKnkfEventsToSupabase(access.db, events);

    await insertCalendarSyncLog(access.db, {
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
  let supabaseClient: NonNullable<
    Awaited<ReturnType<typeof assertCoachLikeOrCron>>["db"]
  > | null = null;
  let triggeredBy: string | null = null;

  try {
    const access = await assertCoachLikeOrCron(request);

    if (!access.db) {
      return NextResponse.json({ error: access.error }, { status: 401 });
    }

    supabaseClient = access.db;
    triggeredBy = access.cron ? null : access.userId;

    if (access.cron) {
      const lastSync = await getLastSuccessfulCalendarSync(access.db);
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (
        lastSync?.created_at &&
        Date.now() - new Date(lastSync.created_at).getTime() < threeDaysMs
      ) {
        return NextResponse.json({
          skipped_recent: true,
          inserted: 0,
          skipped: 0,
          fetched: 0,
          last_sync_at: lastSync.created_at,
        });
      }

      const events = await fetchKnkfCalendarEvents();
      const result = await syncKnkfEventsToSupabase(access.db, events);

      await insertCalendarSyncLog(access.db, {
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
