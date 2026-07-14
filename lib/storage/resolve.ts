import type { StorageRecordLike } from "@/lib/storage/types";
import { getPublicUrl } from "@/lib/storage/index";

export function resolveMediaUrl(record: StorageRecordLike | null | undefined) {
  if (!record) return null;

  if (record.storage_provider === "r2") {
    const r2Url = getPublicUrl({
      provider: record.storage_provider,
      bucket: record.storage_bucket,
      path: record.storage_path || record.video_path,
    });
    if (r2Url) return r2Url;
  }

  const legacy =
    record.file_url ||
    record.video_url ||
    record.avatar_url ||
    record.thumbnail_url ||
    record.image_url;

  if (legacy?.trim()) {
    return legacy.trim();
  }

  return getPublicUrl({
    provider: record.storage_provider,
    bucket: record.storage_bucket,
    path: record.storage_path || record.video_path,
  });
}

export function isR2StorageRecord(record: StorageRecordLike | null | undefined) {
  return record?.storage_provider === "r2" && Boolean(record.storage_path);
}

export function isSupabaseStorageRecord(
  record: StorageRecordLike | null | undefined,
) {
  if (!record) return false;
  if (record.storage_provider === "r2") return false;
  return Boolean(record.storage_path || record.video_path);
}
