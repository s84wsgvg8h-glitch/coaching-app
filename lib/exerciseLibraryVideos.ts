import { captureVideoThumbnail } from "@/lib/videoThumbnail";
import { uploadFileViaApi } from "@/lib/storage/clientUpload";
import { getSignedUrlViaApi } from "@/lib/storage/clientUpload";
import { deleteStoredObject } from "@/lib/storage/clientDelete";
import { getPublicUrl } from "@/lib/storage/index";
import { resolveMediaUrl } from "@/lib/storage/resolve";
import type { StorageUploadResult } from "@/lib/storage/types";

const BUCKET = "exercise-library";
const MAX_SIZE_MB = 250;

type ExerciseLibraryVideoSource = {
  video_url?: string | null;
  video_path?: string | null;
  storage_provider?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
};

function extractExerciseLibraryStoragePath(
  item: ExerciseLibraryVideoSource | null | undefined,
) {
  if (item?.storage_path?.trim()) {
    return item.storage_path.trim();
  }

  const videoPath = item?.video_path?.trim();
  if (videoPath) return videoPath;

  const rawUrl = item?.video_url?.trim();
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
    return rawUrl?.replace(/^\/+/, "") || null;
  }

  const markers = [
    `/storage/v1/object/public/${BUCKET}/`,
    `/storage/v1/object/sign/${BUCKET}/`,
    `/storage/v1/object/authenticated/${BUCKET}/`,
  ];

  for (const marker of markers) {
    const index = rawUrl.indexOf(marker);
    if (index === -1) continue;

    return decodeURIComponent(
      rawUrl.slice(index + marker.length).split("?")[0] || "",
    );
  }

  return null;
}

export function resolveExerciseLibraryVideoUrl(
  item: ExerciseLibraryVideoSource | null | undefined,
) {
  const resolved = resolveMediaUrl({
    file_url: null,
    video_url: item?.video_url,
    storage_provider: item?.storage_provider,
    storage_bucket: item?.storage_bucket || BUCKET,
    storage_path: item?.storage_path || item?.video_path,
  });

  if (resolved) return resolved;

  const storagePath = extractExerciseLibraryStoragePath(item);
  if (storagePath && !/^https?:\/\//i.test(storagePath)) {
    return getPublicUrl({
      provider: item?.storage_provider,
      bucket: BUCKET,
      path: storagePath,
    });
  }

  return item?.video_url?.trim() || null;
}

export async function getExerciseLibraryPlaybackUrl(
  item: ExerciseLibraryVideoSource | null | undefined,
) {
  if (item?.storage_provider === "r2" && item.storage_path) {
    const signed = await getSignedUrlViaApi({
      provider: item.storage_provider,
      bucket: item.storage_bucket,
      path: item.storage_path,
      legacyUrl: item.video_url,
    });
    if (signed.url) return signed.url;
  }

  const storagePath = extractExerciseLibraryStoragePath(item);

  if (storagePath && !/^https?:\/\//i.test(storagePath)) {
    const signed = await getSignedUrlViaApi({
      provider: item?.storage_provider || "supabase",
      bucket: item?.storage_bucket || BUCKET,
      path: storagePath,
      legacyUrl: item?.video_url,
    });
    if (signed.url) return signed.url;
  }

  return resolveExerciseLibraryVideoUrl(item);
}

export function revokeExerciseLibraryPlaybackUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export async function uploadExerciseLibraryVideo(userId: string, file: File) {
  if (!file.type.startsWith("video/")) {
    return {
      videoUrl: null as string | null,
      videoPath: null as string | null,
      thumbnailUrl: null as string | null,
      storage: null as StorageUploadResult | null,
      error: new Error("Alleen videobestanden zijn toegestaan."),
    };
  }

  const maxSizeBytes = MAX_SIZE_MB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      videoUrl: null,
      videoPath: null,
      thumbnailUrl: null,
      storage: null,
      error: new Error(`Video is te groot. Maximaal ${MAX_SIZE_MB} MB.`),
    };
  }

  const isQuickTime =
    file.type === "video/quicktime" ||
    file.name.toLowerCase().endsWith(".mov");
  const uploadFile = isQuickTime
    ? new File([file], file.name.replace(/\.mov$/i, ".mp4"), {
        type: "video/mp4",
      })
    : file;

  const result = await uploadFileViaApi({
    file: uploadFile,
    filename: uploadFile.name,
    uploadType: "exercise-library",
    upsert: true,
  });

  if (result.error || !result.url) {
    return {
      videoUrl: null,
      videoPath: null,
      thumbnailUrl: null,
      storage: null,
      error: result.error || new Error("Upload mislukt."),
    };
  }

  let thumbnailUrl: string | null = null;

  try {
    const thumbnailBlob = await Promise.race([
      captureVideoThumbnail(file),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 2500),
      ),
    ]);
    const thumbFile = new File(
      [thumbnailBlob],
      `thumb-${Date.now()}.jpg`,
      { type: "image/jpeg" },
    );
    const thumbResult = await uploadFileViaApi({
      file: thumbFile,
      filename: thumbFile.name,
      uploadType: "exercise-library",
      context: { isThumbnail: true },
      upsert: true,
    });
    if (!thumbResult.error && thumbResult.url) {
      thumbnailUrl = thumbResult.url;
    }
  } catch {
    // Video upload succeeds without thumbnail preview.
  }

  return {
    videoUrl: result.url,
    videoPath: result.path,
    thumbnailUrl,
    storage: result,
    error: null as Error | null,
  };
}

export async function removeExerciseLibraryStorage(
  paths: string[],
  options?: {
    provider?: string | null;
    bucket?: string | null;
  },
) {
  const cleaned = paths.filter(Boolean);
  if (cleaned.length === 0) return { error: null as Error | null };

  for (const path of cleaned) {
    const { error } = await deleteStoredObject({
      provider: options?.provider,
      bucket: options?.bucket || BUCKET,
      path,
      uploadType: "exercise-library",
    });
    if (error) return { error };
  }

  return { error: null as Error | null };
}
