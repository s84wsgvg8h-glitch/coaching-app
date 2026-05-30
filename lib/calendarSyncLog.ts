import type { SupabaseClient } from "@supabase/supabase-js";

export type CalendarSyncLogStatus = "success" | "error";

export type CalendarSyncLogEntry = {
  id: string;
  triggered_by: string | null;
  source: string;
  status: CalendarSyncLogStatus;
  fetched_count: number;
  inserted_count: number;
  skipped_count: number;
  error_message: string | null;
  created_at: string;
};

export async function insertCalendarSyncLog(
  supabase: SupabaseClient,
  params: {
    triggeredBy?: string | null;
    source?: string;
    status: CalendarSyncLogStatus;
    fetchedCount: number;
    insertedCount: number;
    skippedCount: number;
    errorMessage?: string | null;
  },
) {
  const { error } = await supabase.from("calendar_sync_logs").insert({
    triggered_by: params.triggeredBy ?? null,
    source: params.source ?? "knkf",
    status: params.status,
    fetched_count: params.fetchedCount,
    inserted_count: params.insertedCount,
    skipped_count: params.skippedCount,
    error_message: params.errorMessage ?? null,
  });

  if (error) {
    console.error("calendar_sync_logs insert failed:", error.message);
  }
}

export async function loadRecentCalendarSyncLogs(
  supabase: SupabaseClient,
  limit = 50,
): Promise<CalendarSyncLogEntry[]> {
  const { data, error } = await supabase
    .from("calendar_sync_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("calendar_sync_logs laden mislukt:", error.message);
    return [];
  }

  return (data || []) as CalendarSyncLogEntry[];
}
