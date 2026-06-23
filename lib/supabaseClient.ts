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

export function getRealSupabase() {
  return getRealSupabaseClient();
}

function getRealSupabaseClient() {
  if (!realSupabase) {
    const { url, key } = resolveSupabaseEnv();
    realSupabase = createClient(url, key);
  }
  return realSupabase;
}

let realSupabase: SupabaseClient | null = null;

export const supabase =
  typeof window !== "undefined"
    ? createDemoAwareSupabaseClient(getRealSupabase())
    : getRealSupabase();
