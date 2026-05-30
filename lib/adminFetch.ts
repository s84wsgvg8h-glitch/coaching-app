import { supabase } from "@/lib/supabaseClient";

export async function getAdminAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || "";
}

export async function adminFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: string | null; status: number }> {
  const token = await getAdminAccessToken();

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    return {
      data: null,
      error: payload.error || "Verzoek mislukt.",
      status: response.status,
    };
  }

  return { data: payload as T, error: null, status: response.status };
}
