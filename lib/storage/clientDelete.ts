import { deleteFileViaApi } from "@/lib/storage/clientUpload";
import type { StorageProvider, StorageUploadType } from "@/lib/storage/types";

export async function deleteStoredObject(params: {
  provider?: string | null;
  bucket?: string | null;
  path?: string | null;
  uploadType?: StorageUploadType;
  ownerUserId?: string;
  athleteId?: string;
}) {
  if (!params.path?.trim()) {
    return { error: null as Error | null };
  }

  if (params.provider === "r2" || params.uploadType) {
    const provider: StorageProvider =
      params.provider === "r2" ? "r2" : "supabase";
    return deleteFileViaApi({
      provider,
      bucket: params.bucket || "",
      path: params.path,
      uploadType: params.uploadType,
      ownerUserId: params.ownerUserId,
      athleteId: params.athleteId,
    });
  }

  const { supabase } = await import("@/lib/supabaseClient");

  if (!params.bucket) {
    return { error: new Error("Bucket ontbreekt voor Supabase delete.") };
  }

  const { error } = await supabase.storage
    .from(params.bucket)
    .remove([params.path.replace(/^\/+/, "")]);

  return { error: error ? new Error(error.message) : null };
}
