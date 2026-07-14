import type { SupabaseClient } from "@supabase/supabase-js";
import { getR2Config } from "@/lib/storage/env";
import {
  addFeedbackMediaUrls,
  addImageUrlsArray,
  addReferencedKeysFromRow,
} from "@/lib/storage/referencedKeys";
import { deleteR2ObjectKey, listR2Objects } from "@/lib/storage/r2";

export type StorageCleanupResult = {
  dryRun: boolean;
  deleteEnabled: boolean;
  totalR2Objects: number;
  referencedKeys: number;
  orphanedCount: number;
  orphaned: { key: string; size?: number }[];
  deleted: string[];
};

function isDryRun() {
  const value = process.env.STORAGE_CLEANUP_DRY_RUN?.trim().toLowerCase();
  return value !== "false";
}

function isDeleteEnabled() {
  return process.env.STORAGE_CLEANUP_DELETE_ENABLED?.trim().toLowerCase() === "true";
}

async function fetchAllRows<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
) {
  const pageSize = 1000;
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;

    rows.push(...(data as unknown as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export async function collectReferencedR2Keys(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const config = getR2Config();
  const publicUrlBase = config?.publicUrl;
  const keys = new Set<string>();

  const messageRows = await fetchAllRows<{
    file_url: string | null;
    storage_path: string | null;
  }>(supabase, "messages", "file_url, storage_path");

  for (const row of messageRows) {
    addReferencedKeysFromRow(keys, row, {
      urlFields: ["file_url"],
      pathFields: ["storage_path"],
      publicUrlBase,
    });
  }

  const athleteVideoRows = await fetchAllRows<{
    video_url: string | null;
    video_path: string | null;
    storage_path: string | null;
  }>(
    supabase,
    "athlete_exercise_videos",
    "video_url, video_path, storage_path",
  );

  for (const row of athleteVideoRows) {
    addReferencedKeysFromRow(keys, row, {
      urlFields: ["video_url"],
      pathFields: ["video_path", "storage_path"],
      publicUrlBase,
    });
  }

  const reviewRows = await fetchAllRows<{
    video_url: string | null;
    thumbnail_url: string | null;
    feedback_media: unknown;
    storage_path: string | null;
  }>(
    supabase,
    "video_reviews",
    "video_url, thumbnail_url, feedback_media, storage_path",
  );

  for (const row of reviewRows) {
    addReferencedKeysFromRow(keys, row, {
      urlFields: ["video_url", "thumbnail_url"],
      pathFields: ["storage_path"],
      publicUrlBase,
    });
    addFeedbackMediaUrls(keys, row.feedback_media, publicUrlBase);
  }

  const libraryRows = await fetchAllRows<{
    video_url: string | null;
    thumbnail_url: string | null;
    video_path: string | null;
    storage_path: string | null;
  }>(
    supabase,
    "exercise_library_items",
    "video_url, thumbnail_url, video_path, storage_path",
  );

  for (const row of libraryRows) {
    addReferencedKeysFromRow(keys, row, {
      urlFields: ["video_url", "thumbnail_url"],
      pathFields: ["video_path", "storage_path"],
      publicUrlBase,
    });
  }

  const profileRows = await fetchAllRows<{
    avatar_url: string | null;
    storage_path: string | null;
  }>(supabase, "profiles", "avatar_url, storage_path");

  for (const row of profileRows) {
    addReferencedKeysFromRow(keys, row, {
      urlFields: ["avatar_url"],
      pathFields: ["storage_path"],
      publicUrlBase,
    });
  }

  const groupRows = await fetchAllRows<{
    avatar_url: string | null;
    storage_path: string | null;
  }>(supabase, "chat_groups", "avatar_url, storage_path");

  for (const row of groupRows) {
    addReferencedKeysFromRow(keys, row, {
      urlFields: ["avatar_url"],
      pathFields: ["storage_path"],
      publicUrlBase,
    });
  }

  const merchRows = await fetchAllRows<{
    image_url: string | null;
    image_urls: unknown;
    storage_path: string | null;
  }>(supabase, "merch_items", "image_url, image_urls, storage_path");

  for (const row of merchRows) {
    addReferencedKeysFromRow(keys, row, {
      urlFields: ["image_url"],
      pathFields: ["storage_path"],
      publicUrlBase,
    });
    addImageUrlsArray(keys, row.image_urls, publicUrlBase);
  }

  return keys;
}

export async function runStorageCleanup(
  supabase: SupabaseClient,
): Promise<StorageCleanupResult> {
  const dryRun = isDryRun();
  const deleteEnabled = isDeleteEnabled();

  if (!getR2Config()) {
    throw new Error("Cloudflare R2 is niet geconfigureerd.");
  }

  const [r2Objects, referencedKeys] = await Promise.all([
    listR2Objects(),
    collectReferencedR2Keys(supabase),
  ]);

  const orphaned = r2Objects.filter((obj) => !referencedKeys.has(obj.key));
  const deleted: string[] = [];

  if (!dryRun && deleteEnabled) {
    for (const obj of orphaned) {
      await deleteR2ObjectKey(obj.key);
      deleted.push(obj.key);
    }
  }

  return {
    dryRun,
    deleteEnabled,
    totalR2Objects: r2Objects.length,
    referencedKeys: referencedKeys.size,
    orphanedCount: orphaned.length,
    orphaned: orphaned.slice(0, 200),
    deleted,
  };
}
