import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isCoachLikeRole } from "@/lib/authRoles";

export function getSupabaseForRequest(request: Request) {
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

export async function assertCoachLike(request: Request): Promise<{
  error: string | null;
  db: SupabaseClient | null;
  userId: string | null;
}> {
  const supabase = getSupabaseForRequest(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Niet ingelogd.", db: null, userId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isCoachLikeRole(profile?.role)) {
    return { error: "Alleen coaches.", db: null, userId: null };
  }

  const serviceClient = getServiceClient();
  if (!serviceClient) {
    return { error: "Service role key ontbreekt.", db: null, userId: null };
  }

  return { error: null, db: serviceClient, userId: user.id };
}

export async function getAuthSessionToken() {
  const { supabase } = await import("@/lib/supabaseClient");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}
