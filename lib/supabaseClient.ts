import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDemoAwareSupabaseClient } from "@/lib/demo/demoSupabase";
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
} from "@/lib/supabasePublicEnv";

function resolveSupabaseEnv() {
  return {
    url: getPublicSupabaseUrl(),
    key: getPublicSupabaseAnonKey(),
  };
}

function createRealSupabaseClient() {
  const { url, key } = resolveSupabaseEnv();

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage:
        typeof window !== "undefined" ? window.localStorage : undefined,
    },
  });
}

export function getRealSupabase() {
  return getRealSupabaseClient();
}

function getRealSupabaseClient() {
  if (!realSupabase) {
    realSupabase = createRealSupabaseClient();
  }
  return realSupabase;
}

let realSupabase: SupabaseClient | null = null;

export const supabase =
  typeof window !== "undefined"
    ? createDemoAwareSupabaseClient(getRealSupabase())
    : getRealSupabase();
