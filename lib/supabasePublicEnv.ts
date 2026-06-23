/** Public Supabase project URL — safe to embed (also in NEXT_PUBLIC_*). */
export const PRODUCTION_SUPABASE_URL =
  "https://dgryvmvfwyixscidmzrc.supabase.co";

/** Publishable anon key — safe to embed in client bundles. */
export const PRODUCTION_SUPABASE_ANON_KEY =
  "sb_publishable_2ZUXR3KiWc9An7Mie4c3fA_YDSKDtjQ";

function normalizeEnvValue(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === '""') return "";
  return trimmed.replace(/^"|"$/g, "");
}

export function getPublicSupabaseUrl(): string {
  const fromEnv = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (fromEnv && fromEnv !== "https://placeholder.supabase.co") {
    return fromEnv;
  }

  return PRODUCTION_SUPABASE_URL;
}

export function getPublicSupabaseAnonKey(): string {
  const fromEnv = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (
    fromEnv &&
    fromEnv !== "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder"
  ) {
    return fromEnv;
  }

  return PRODUCTION_SUPABASE_ANON_KEY;
}
