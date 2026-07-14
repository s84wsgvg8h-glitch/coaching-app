import { uploadFileViaApi } from "@/lib/storage/clientUpload";
import { toStorageMetadata } from "@/lib/storage/types";
import type { StorageMetadataFields } from "@/lib/storage/types";
import { supabase } from "@/lib/supabaseClient";

export async function uploadAvatar(userId: string, file: File, scope: string) {
  const result = await uploadFileViaApi({
    file,
    filename: file.name,
    uploadType: "avatars",
    context: { scope },
    upsert: true,
  });

  if (result.error || !result.url) {
    return {
      url: null as string | null,
      storage: null,
      error: result.error || new Error("Upload mislukt."),
    };
  }

  return {
    url: result.url,
    storage: result,
    error: null as Error | null,
  };
}

export async function updateProfileAvatar(
  userId: string,
  avatarUrl: string,
  storage?: StorageMetadataFields | null,
) {
  return supabase
    .from("profiles")
    .update({
      avatar_url: avatarUrl,
      ...(storage || {}),
    })
    .eq("id", userId);
}

export async function updateGroupAvatar(
  groupId: string,
  avatarUrl: string,
  storage?: StorageMetadataFields | null,
) {
  return supabase
    .from("chat_groups")
    .update({
      avatar_url: avatarUrl,
      ...(storage || {}),
    })
    .eq("id", groupId);
}

export { toStorageMetadata };
