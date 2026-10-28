import type { StorageUploadType } from "@/lib/storage/types";

/** Vercel serverless request body limit is ~4.5 MB. */
export const DIRECT_API_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

/** Chat videos above Vercel's direct upload limit use R2 (presigned or multipart). */
export const CHAT_VIDEO_PRESIGNED_THRESHOLD_BYTES = DIRECT_API_UPLOAD_MAX_BYTES;

/** Stay under Vercel's ~4.5 MB request body limit (multipart form overhead). */
export const MULTIPART_PART_SIZE_BYTES = 3 * 1024 * 1024;

const PRESIGNED_LARGE_FILE_TYPES = new Set<StorageUploadType>([
  "exercise-videos",
  "exercise-library",
]);

export function shouldUsePresignedUpload(
  uploadType: StorageUploadType,
  fileSize: number,
) {
  if (
    PRESIGNED_LARGE_FILE_TYPES.has(uploadType) &&
    fileSize > DIRECT_API_UPLOAD_MAX_BYTES
  ) {
    return true;
  }
  if (
    uploadType === "chat-media" &&
    fileSize > CHAT_VIDEO_PRESIGNED_THRESHOLD_BYTES
  ) {
    return true;
  }
  return false;
}

export function canUseDirectApiUpload(fileSize: number) {
  return fileSize > 0 && fileSize <= DIRECT_API_UPLOAD_MAX_BYTES;
}
