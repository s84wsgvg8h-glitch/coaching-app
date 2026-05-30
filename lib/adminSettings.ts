import { supabase } from "@/lib/supabaseClient";

export type FeatureFlags = {
  enableMerch?: boolean;
  enableAiChat?: boolean;
  enableExerciseLibrary?: boolean;
  enableCompetitionCalendar?: boolean;
  [key: string]: boolean | undefined;
};

export type EmailTemplate = {
  subject: string;
  body: string;
};

export type EmailTemplates = {
  welcome_coach?: EmailTemplate;
  welcome_athlete?: EmailTemplate;
  coach_approved?: EmailTemplate;
  coach_rejected?: EmailTemplate;
  [key: string]: EmailTemplate | undefined;
};

export type AppSettings = {
  id: number;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  welcome_message: string | null;
  feature_flags: FeatureFlags;
  email_templates: EmailTemplates;
  updated_at: string;
  updated_by: string | null;
};

export type SystemBannerRow = {
  id: string;
  message: string;
  banner_type: "info" | "warning" | "success" | "error";
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  maintenance_mode: false,
  maintenance_message: null,
  welcome_message: null,
  feature_flags: {},
  email_templates: {},
  updated_at: new Date().toISOString(),
  updated_by: null,
};

export async function loadAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_SETTINGS;
  }

  return {
    id: 1,
    maintenance_mode: Boolean(data.maintenance_mode),
    maintenance_message: data.maintenance_message ?? null,
    welcome_message: data.welcome_message ?? null,
    feature_flags: (data.feature_flags as FeatureFlags) || {},
    email_templates: (data.email_templates as EmailTemplates) || {},
    updated_at: data.updated_at,
    updated_by: data.updated_by ?? null,
  };
}

export async function saveAppSettings(
  patch: Partial<
    Pick<
      AppSettings,
      | "maintenance_mode"
      | "maintenance_message"
      | "welcome_message"
      | "feature_flags"
      | "email_templates"
    >
  >,
  updatedBy: string,
) {
  return supabase
    .from("app_settings")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    })
    .eq("id", 1);
}

export async function loadAllSystemBanners(): Promise<SystemBannerRow[]> {
  const { data, error } = await supabase
    .from("system_banners")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Banners laden mislukt:", error.message);
    return [];
  }

  return (data || []) as SystemBannerRow[];
}

export async function createSystemBanner(
  banner: Omit<SystemBannerRow, "id" | "created_at" | "created_by">,
  createdBy: string,
) {
  return supabase.from("system_banners").insert({
    message: banner.message,
    banner_type: banner.banner_type,
    active: banner.active,
    starts_at: banner.starts_at,
    ends_at: banner.ends_at,
    created_by: createdBy,
  });
}

export async function updateSystemBanner(
  id: string,
  patch: Partial<
    Pick<SystemBannerRow, "message" | "banner_type" | "active" | "starts_at" | "ends_at">
  >,
) {
  return supabase.from("system_banners").update(patch).eq("id", id);
}

export async function deleteSystemBanner(id: string) {
  return supabase.from("system_banners").delete().eq("id", id);
}

export const DEFAULT_FEATURE_FLAG_KEYS = [
  { key: "enableMerch", label: "Merch-pagina" },
  { key: "enableAiChat", label: "AI-chat in berichten" },
  { key: "enableExerciseLibrary", label: "Oefeningenbibliotheek" },
  { key: "enableCompetitionCalendar", label: "Wedstrijdkalender sync" },
] as const;

export const DEFAULT_EMAIL_TEMPLATE_KEYS = [
  { key: "welcome_coach", label: "Welkom coach" },
  { key: "welcome_athlete", label: "Welkom atleet" },
  { key: "coach_approved", label: "Coach goedgekeurd" },
  { key: "coach_rejected", label: "Coach afgewezen" },
] as const;
