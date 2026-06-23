import { supabase } from "@/lib/supabaseClient";

export type NotificationPreferences = {
  push_enabled: boolean;
  workout_reminders: boolean;
  weekly_digest: boolean;
  winback: boolean;
  low_compliance_coach: boolean;
};

export type AthleteCoachPreferences = {
  show_e1rm_inline: boolean;
  notifications: NotificationPreferences;
};

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  push_enabled: true,
  workout_reminders: true,
  weekly_digest: true,
  winback: true,
  low_compliance_coach: true,
};

const DEFAULT_PREFERENCES: AthleteCoachPreferences = {
  show_e1rm_inline: true,
  notifications: DEFAULT_NOTIFICATIONS,
};

function mergePreferences(raw: unknown): AthleteCoachPreferences {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const coachPrefs =
    obj.coach_settings && typeof obj.coach_settings === "object"
      ? (obj.coach_settings as Record<string, unknown>)
      : {};
  const notif =
    coachPrefs.notifications && typeof coachPrefs.notifications === "object"
      ? (coachPrefs.notifications as Partial<NotificationPreferences>)
      : {};

  return {
    show_e1rm_inline:
      typeof coachPrefs.show_e1rm_inline === "boolean"
        ? coachPrefs.show_e1rm_inline
        : DEFAULT_PREFERENCES.show_e1rm_inline,
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      ...notif,
    },
  };
}

export async function loadAthleteCoachPreferences(
  athleteId: string,
): Promise<AthleteCoachPreferences> {
  const { data } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", athleteId)
    .maybeSingle();

  return mergePreferences(data?.preferences);
}

export async function saveAthleteCoachPreferences(
  athleteId: string,
  patch: Partial<AthleteCoachPreferences>,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", athleteId)
    .maybeSingle();

  const current = mergePreferences(profile?.preferences);
  const nextCoachSettings: AthleteCoachPreferences = {
    show_e1rm_inline: patch.show_e1rm_inline ?? current.show_e1rm_inline,
    notifications: {
      ...current.notifications,
      ...(patch.notifications || {}),
    },
  };

  const base =
    profile?.preferences && typeof profile.preferences === "object"
      ? (profile.preferences as Record<string, unknown>)
      : {};

  const { error } = await supabase
    .from("profiles")
    .update({
      preferences: {
        ...base,
        coach_settings: nextCoachSettings,
      },
    })
    .eq("id", athleteId);

  return { preferences: nextCoachSettings, error };
}

export async function loadUserNotificationPreferences(userId: string) {
  const prefs = await loadAthleteCoachPreferences(userId);
  return prefs.notifications;
}
