import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { StorageUploadType } from "@/lib/storage/types";
import { isCoachLikeRole, isAdminRole } from "@/lib/authRoles";

export async function canUploadType(
  supabase: SupabaseClient,
  user: User,
  uploadType: StorageUploadType,
  context: {
    athleteId?: string;
    reviewId?: string;
  },
) {
  if (uploadType === "exercise-library" || uploadType === "merch-images") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return isCoachLikeRole(profile?.role) || isAdminRole(profile?.role);
  }

  if (uploadType === "exercise-videos" && context.reviewId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return isCoachLikeRole(profile?.role) || isAdminRole(profile?.role);
  }

  return true;
}

export async function canDeleteStorageObject(
  supabase: SupabaseClient,
  user: User,
  input: {
    provider: string;
    path: string;
    bucket?: string;
    uploadType?: StorageUploadType;
    ownerUserId?: string;
    athleteId?: string;
  },
) {
  if (input.provider !== "r2" && input.provider !== "supabase") {
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, coach_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role || "";
  const isCoach = isCoachLikeRole(role) || isAdminRole(role);

  const path = input.path.replace(/^\/+/, "");

  if (input.ownerUserId && input.ownerUserId === user.id) {
    return true;
  }

  if (path.startsWith(`${user.id}/`)) {
    return true;
  }

  if (path.startsWith(`avatars/${user.id}/`)) {
    return true;
  }

  if (path.startsWith(`chat-media/${user.id}/`)) {
    return true;
  }

  if (path.startsWith(`merch-images/${user.id}/`)) {
    return true;
  }

  if (path.startsWith(`merch/${user.id}/`)) {
    return true;
  }

  if (
    path.startsWith(`exercise-library/${user.id}/`) ||
    path.startsWith(`library/${user.id}/`)
  ) {
    return true;
  }

  const athleteId = input.athleteId || path.split("/")[0];
  if (athleteId && (path.startsWith(`${athleteId}/`) || path.includes(`exercise-videos/${athleteId}/`))) {
    if (user.id === athleteId) return true;

    const { data: athleteProfile } = await supabase
      .from("profiles")
      .select("coach_id")
      .eq("id", athleteId)
      .maybeSingle();

    if (isCoach && athleteProfile?.coach_id === user.id) {
      return true;
    }
  }

  if (isCoach && path.includes(`/review-feedback/`)) {
    return true;
  }

  return isAdminRole(role);
}

/** Normalize object keys / storage paths for ACL checks. */
function normalizeStoragePath(path: string) {
  return path.replace(/^\/+/, "");
}

async function canReadViaStorageRecordReference(
  supabase: SupabaseClient,
  path: string,
): Promise<boolean> {
  const candidates = Array.from(
    new Set([path, normalizeStoragePath(path), normalizeStoragePath(path).replace(/^chat-media\//, "")]),
  ).filter(Boolean);

  const tables: Array<{ table: string; columns: string[] }> = [
    { table: "messages", columns: ["storage_path", "file_url"] },
    { table: "exercise_library_items", columns: ["storage_path", "video_url"] },
    { table: "athlete_exercise_videos", columns: ["storage_path", "video_url"] },
    { table: "video_reviews", columns: ["storage_path", "video_url"] },
    { table: "merch_items", columns: ["storage_path", "image_url"] },
    { table: "profiles", columns: ["storage_path", "avatar_url"] },
    { table: "chat_groups", columns: ["storage_path", "avatar_url"] },
  ];

  for (const { table, columns } of tables) {
    for (const column of columns) {
      for (const candidate of candidates) {
        const { data } = await supabase
          .from(table)
          .select("id")
          .eq(column, candidate)
          .limit(1)
          .maybeSingle();

        if (data) return true;
      }
    }
  }

  return false;
}

export async function canReadStorageObject(
  supabase: SupabaseClient,
  user: User,
  input: {
    provider: string;
    path: string;
    bucket?: string;
    legacyUrl?: string | null;
  },
) {
  if (input.provider !== "r2" && input.provider !== "supabase") {
    return false;
  }

  const path = normalizeStoragePath(input.path || "");

  if (path) {
    const allowedByPath = await canDeleteStorageObject(supabase, user, {
      provider: input.provider,
      path,
      bucket: input.bucket,
    });

    if (allowedByPath) return true;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, coach_id")
      .eq("id", user.id)
      .maybeSingle();

    const libraryOwnerMatch = path.match(/^exercise-library\/([^/]+)\//);
    if (libraryOwnerMatch && profile?.coach_id === libraryOwnerMatch[1]) {
      return true;
    }

    if (await canReadViaStorageRecordReference(supabase, path)) {
      return true;
    }
  }

  const legacyUrl = input.legacyUrl?.trim();
  if (legacyUrl) {
    return canReadViaStorageRecordReference(supabase, legacyUrl);
  }

  return false;
}
