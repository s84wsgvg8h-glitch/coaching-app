import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDemoAwareSupabaseClient } from "@/lib/demo/demoSupabase";

function resolveSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && key) return { url, key };
  // Local production builds can ship blank placeholders in .env.production.local.
  return {
    url: "https://placeholder.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder",
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
