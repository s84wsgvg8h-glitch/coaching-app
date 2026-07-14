import type { StorageProvider } from "@/lib/storage/types";

export function getStorageProvider(): StorageProvider {
  const value = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (value === "r2" || value === "supabase") return value;
  return getR2Config() ? "r2" : "supabase";
}

export function getR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET?.trim();
  const publicUrl = (
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    ""
  ).replace(/\/$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

export function getSupabasePublicUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "https://dgryvmvfwyixscidmzrc.supabase.co"
  ).replace(/\/$/, "");
}
