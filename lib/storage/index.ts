import { getStorageProvider } from "@/lib/storage/env";
import {
  deleteFromR2,
  getR2PublicUrl,
  getR2SignedUrl,
  uploadToR2,
} from "@/lib/storage/r2";
import {
  deleteFromSupabase,
  getSupabaseSignedUrl,
  getSupabaseStoragePublicUrl,
  uploadToSupabase,
} from "@/lib/storage/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageDeleteInput, StorageUploadResult } from "@/lib/storage/types";

export async function uploadFile(params: {
  supabase: SupabaseClient;
  bucket: string;
  path: string;
  objectKey: string;
  body: Buffer | Uint8Array;
  contentType: string;
  upsert?: boolean;
}): Promise<StorageUploadResult> {
  const provider = getStorageProvider();

  if (provider === "r2") {
    return uploadToR2({
      objectKey: params.objectKey,
      body: params.body,
      contentType: params.contentType,
    });
  }

  return uploadToSupabase(params.supabase, {
    bucket: params.bucket,
    path: params.path,
    body: params.body,
    contentType: params.contentType,
    upsert: params.upsert,
  });
}

export async function deleteFile(
  supabase: SupabaseClient,
  input: StorageDeleteInput,
) {
  if (input.provider === "r2") {
    return deleteFromR2(input);
  }

  return deleteFromSupabase(supabase, input);
}

export function getPublicUrl(input: {
  provider?: string | null;
  bucket?: string | null;
  path?: string | null;
  legacyUrl?: string | null;
}) {
  if (input.legacyUrl?.trim()) {
    return input.legacyUrl.trim();
  }

  if (!input.path?.trim()) {
    return null;
  }

  if (input.provider === "r2") {
    return getR2PublicUrl(input.path);
  }

  if (input.bucket) {
    return getSupabaseStoragePublicUrl(input.bucket, input.path);
  }

  return null;
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  input: {
    provider?: string | null;
    bucket?: string | null;
    path?: string | null;
    legacyUrl?: string | null;
    expiresInSeconds?: number;
  },
) {
  const expiresIn = input.expiresInSeconds ?? 3600;

  if (input.provider === "r2" && input.path) {
    return getR2SignedUrl(input.path);
  }

  if (input.bucket && input.path) {
    return getSupabaseSignedUrl(supabase, input.bucket, input.path, expiresIn);
  }

  return input.legacyUrl || null;
}

export { getStorageProvider } from "@/lib/storage/env";
export { buildStoragePath } from "@/lib/storage/paths";
export { validateStorageFile as validateFile } from "@/lib/storage/validation";
