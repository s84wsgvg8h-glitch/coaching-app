import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicUrl } from "@/lib/storage/env";
import type { StorageDeleteInput, StorageUploadResult } from "@/lib/storage/types";

export function getSupabaseStoragePublicUrl(bucket: string, path: string) {
  return `${getSupabasePublicUrl()}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, "")}`;
}

export async function uploadToSupabase(
  supabase: SupabaseClient,
  params: {
    bucket: string;
    path: string;
    body: Buffer | Uint8Array;
    contentType: string;
    upsert?: boolean;
  },
): Promise<StorageUploadResult> {
  const { error } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, params.body, {
      upsert: params.upsert ?? false,
      contentType: params.contentType,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    url: getSupabaseStoragePublicUrl(params.bucket, params.path),
    path: params.path,
    bucket: params.bucket,
    provider: "supabase",
    contentType: params.contentType,
    size: params.body.byteLength,
  };
}

export async function deleteFromSupabase(
  supabase: SupabaseClient,
  input: StorageDeleteInput,
) {
  const { error } = await supabase.storage.from(input.bucket).remove([input.path]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getSupabaseSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds: number,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Signed URL kon niet worden gemaakt.");
  }

  return data.signedUrl;
}
