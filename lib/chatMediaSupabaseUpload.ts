import { supabase } from "@/lib/supabaseClient";
import { buildStoragePath } from "@/lib/storage/paths";
import { getSupabaseStoragePublicUrl } from "@/lib/storage/supabase";
import type { StorageUploadResult } from "@/lib/storage/types";

const UPLOAD_TIMEOUT_MS = 8 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(message));
    }, UPLOAD_TIMEOUT_MS);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Upload chat media straight to Supabase Storage from the client.
 * Works reliably on iOS/Capacitor (no cross-origin R2 PUT, no Vercel multipart loop).
 */
export async function uploadChatMediaViaSupabase(
  userId: string,
  file: File,
): Promise<StorageUploadResult> {
  const { bucket, path } = buildStoragePath("chat-media", userId, file.name);
  const contentType = file.type || "application/octet-stream";

  const uploadResult = await withTimeout(
    supabase.storage.from(bucket).upload(path, file, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    }),
    "Upload duurde te lang. Probeer opnieuw op wifi of een kleinere video.",
  );

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  return {
    url: getSupabaseStoragePublicUrl(bucket, path),
    path,
    bucket,
    provider: "supabase",
    contentType,
    size: file.size,
  };
}
