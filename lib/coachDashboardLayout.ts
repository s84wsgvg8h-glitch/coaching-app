import { supabase } from "@/lib/supabaseClient";
import {
  DASHBOARD_LAYOUT_VERSION,
  loadCoachWidgetLayout,
  resolveCoachWidgetLayout,
  sanitizeLayout,
  saveCoachWidgetLayout,
  wrapCoachWidgetLayout,
  type CoachWidgetLayoutItem,
  type StoredCoachWidgetLayout,
} from "@/lib/dashboardWidgetOrder";

const STORAGE_KEY = "coach-dashboard-widget-layout";

function parseRemoteLayout(raw: unknown): StoredCoachWidgetLayout | null {
  if (Array.isArray(raw)) {
    const items = sanitizeLayout(raw);
    return items.length > 0 ? { version: DASHBOARD_LAYOUT_VERSION, items } : null;
  }

  if (raw && typeof raw === "object") {
    const record = raw as Partial<StoredCoachWidgetLayout>;
    const items = sanitizeLayout(record.items);
    if (items.length === 0) return null;
    return {
      version:
        typeof record.version === "number"
          ? record.version
          : DASHBOARD_LAYOUT_VERSION,
      items,
    };
  }

  return null;
}

export async function loadCoachWidgetLayoutAsync(
  coachId: string,
): Promise<CoachWidgetLayoutItem[]> {
  const localItems = loadCoachWidgetLayout();

  const { data, error } = await supabase
    .from("profiles")
    .select("coach_dashboard_layout")
    .eq("id", coachId)
    .single();

  const remote =
    !error && data?.coach_dashboard_layout
      ? parseRemoteLayout(data.coach_dashboard_layout)
      : null;
  const remoteItems = remote ? sanitizeLayout(remote.items) : [];

  if (remote && remote.version < DASHBOARD_LAYOUT_VERSION) {
    const migrated = resolveCoachWidgetLayout(null);
    saveCoachWidgetLayout(migrated);
    await supabase
      .from("profiles")
      .update({ coach_dashboard_layout: wrapCoachWidgetLayout(migrated) })
      .eq("id", coachId);
    return migrated;
  }

  if (remoteItems.length > 0) {
    saveCoachWidgetLayout(remoteItems);
    return remoteItems;
  }

  if (localItems.length > 0) {
    await supabase
      .from("profiles")
      .update({ coach_dashboard_layout: wrapCoachWidgetLayout(localItems) })
      .eq("id", coachId);
  }

  return localItems;
}

export async function saveCoachWidgetLayoutAsync(
  coachId: string,
  layout: CoachWidgetLayoutItem[],
) {
  const wrapped = wrapCoachWidgetLayout(layout);
  saveCoachWidgetLayout(layout);

  await supabase
    .from("profiles")
    .update({ coach_dashboard_layout: wrapped })
    .eq("id", coachId);
}

export { STORAGE_KEY };
