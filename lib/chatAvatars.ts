import { supabase } from "@/lib/supabaseClient";

const BUCKET = "avatars";

export async function uploadAvatar(userId: string, file: File, scope: string) {
  const extension = file.name.split(".").pop() || "jpg";
  const filePath = `${userId}/${scope}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) {
    return { url: null as string | null, error: uploadError };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return { url: data.publicUrl, error: null as Error | null };
}

export async function updateProfileAvatar(userId: string, avatarUrl: string) {
  return supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);
}

export async function updateGroupAvatar(groupId: string, avatarUrl: string) {
  return supabase
    .from("chat_groups")
    .update({ avatar_url: avatarUrl })
    .eq("id", groupId);
}
