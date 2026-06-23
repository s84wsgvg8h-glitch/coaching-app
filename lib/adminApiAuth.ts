import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_ACCESS_TOKEN, getBearerToken } from "@/lib/apiAuth";

export function getSupabaseForRequest(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase is niet geconfigureerd.");
  }

  const token = getBearerToken(request);

  return createClient(url, anonKey, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return null;
  }

  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function assertAdmin(request: Request): Promise<{
  error: string | null;
  admin: SupabaseClient | null;
  userId: string | null;
}> {
  const token = getBearerToken(request);

  if (!token || token === DEMO_ACCESS_TOKEN) {
    return { error: "Niet ingelogd.", admin: null, userId: null };
  }

  const adminClient = getServiceClient();
  if (!adminClient) {
    return { error: "Service role key ontbreekt.", admin: null, userId: null };
  }

  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(token);

  if (userError || !user) {
    return { error: "Niet ingelogd.", admin: null, userId: null };
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { error: "Alleen admins.", admin: null, userId: null };
  }

  return { error: null, admin: adminClient, userId: user.id };
}
