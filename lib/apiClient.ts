import { supabase } from "@/lib/supabaseClient";
import { isDemoMode } from "@/lib/demo/demoMode";

export async function getApiAuthHeaders(
  extra?: HeadersInit,
): Promise<HeadersInit> {
  if (isDemoMode()) {
    return { ...extra };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token?.trim();

  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
