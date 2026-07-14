export type StorageProvider = "supabase" | "r2";

export type StorageUploadType =
  | "chat-media"
  | "exercise-videos"
  | "exercise-library"
  | "avatars"
  | "merch-images";

export type UploadContext = {
  scope?: string;
  athleteId?: string;
  exerciseId?: string;
  setNumber?: number;
  reviewId?: string;
  isThumbnail?: boolean;
};

export type StorageUploadResult = {
  url: string;
  path: string;
  bucket: string;
  provider: StorageProvider;
  contentType: string;
  size: number;
};

export type StorageDeleteInput = {
  provider: StorageProvider;
  bucket: string;
  path: string;
};

export type StorageRecordLike = {
  file_url?: string | null;
  video_url?: string | null;
  avatar_url?: string | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  video_path?: string | null;
  storage_provider?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
};

export type StorageMetadataFields = {
  storage_provider: StorageProvider;
  storage_bucket: string;
  storage_path: string;
  storage_content_type: string;
  storage_size_bytes: number;
};

export function toStorageMetadata(
  result: StorageUploadResult,
): StorageMetadataFields {
  return {
    storage_provider: result.provider,
    storage_bucket: result.bucket,
    storage_path: result.path,
    storage_content_type: result.contentType,
    storage_size_bytes: result.size,
  };
}
