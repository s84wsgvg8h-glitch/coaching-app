import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const DEMO_ACCESS_TOKEN = "demo-access-token";

export function getBearerToken(request: Request): string | null {
  const raw =
    request.headers.get("Authorization") ??
    request.headers.get("authorization");
  const token = raw?.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function getSupabaseForRequest(request: Request) {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase is niet geconfigureerd.");
  }

  const token = getBearerToken(request);
  return createClient(env.url, env.anonKey, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
}

type AuthResult =
  | { error: null; supabase: SupabaseClient; user: User }
  | { error: string; status: 401; supabase: null; user: null };

export async function assertAuthenticated(request: Request): Promise<AuthResult> {
  const token = getBearerToken(request);

  if (!token || token === DEMO_ACCESS_TOKEN) {
    return {
      error: "Niet ingelogd.",
      status: 401,
      supabase: null,
      user: null,
    };
  }

  const supabase = getSupabaseForRequest(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: "Niet ingelogd.",
      status: 401,
      supabase: null,
      user: null,
    };
  }

  return { error: null, supabase, user };
}
