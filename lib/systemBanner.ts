import { supabase } from "@/lib/supabaseClient";

export type SystemBannerType = "info" | "warning" | "success" | "error";

export type SystemBanner = {
  id: string;
  message: string;
  banner_type: SystemBannerType;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

function isBannerCurrentlyActive(banner: SystemBanner) {
  const now = Date.now();
  if (!banner.active) return false;
  if (banner.starts_at && new Date(banner.starts_at).getTime() > now) {
    return false;
  }
  if (banner.ends_at && new Date(banner.ends_at).getTime() <= now) {
    return false;
  }
  return true;
}

export async function loadActiveSystemBanner(): Promise<SystemBanner | null> {
  const { data, error } = await supabase
    .from("system_banners")
    .select("id, message, banner_type, active, starts_at, ends_at, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Systeembanner laden mislukt:", error.message);
    return null;
  }

  const rows = (data || []) as SystemBanner[];
  return rows.find(isBannerCurrentlyActive) ?? null;
}
