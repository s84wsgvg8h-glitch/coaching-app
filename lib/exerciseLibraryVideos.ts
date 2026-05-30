import { supabase } from "@/lib/supabaseClient";
import { captureVideoThumbnail } from "@/lib/videoThumbnail";

const BUCKET = "exercise-library";
const MAX_SIZE_MB = 250;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

type ExerciseLibraryVideoSource = {
  video_url?: string | null;
  video_path?: string | null;
};

function extractExerciseLibraryStoragePath(
  item: ExerciseLibraryVideoSource | null | undefined,
) {
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
  const storagePath = extractExerciseLibraryStoragePath(item);
  if (storagePath && !/^https?:\/\//i.test(storagePath)) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  const rawUrl = item?.video_url?.trim();
  if (rawUrl && /^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  return null;
}

export async function getExerciseLibraryPlaybackUrl(
  item: ExerciseLibraryVideoSource | null | undefined,
) {
  const storagePath = extractExerciseLibraryStoragePath(item);

  if (storagePath && !/^https?:\/\//i.test(storagePath)) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
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
      error: new Error("Alleen videobestanden zijn toegestaan."),
    };
  }

  const maxSizeBytes = MAX_SIZE_MB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      videoUrl: null,
      videoPath: null,
      thumbnailUrl: null,
      error: new Error(`Video is te groot. Maximaal ${MAX_SIZE_MB} MB.`),
    };
  }

  const timestamp = Date.now();
  const isQuickTime =
    file.type === "video/quicktime" ||
    file.name.toLowerCase().endsWith(".mov");
  const extension = isQuickTime
    ? "mp4"
    : file.name.split(".").pop() || "mp4";
  const videoPath = `library/${userId}/${timestamp}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(videoPath, file, {
      upsert: true,
      contentType: isQuickTime ? "video/mp4" : file.type || "video/mp4",
    });

  if (uploadError) {
    return {
      videoUrl: null,
      videoPath: null,
      thumbnailUrl: null,
      error: uploadError,
    };
  }

  const { data: videoPublic } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(videoPath);

  let thumbnailUrl: string | null = null;

  void (async () => {
    try {
      const thumbnailBlob = await captureVideoThumbnail(file);
      const thumbnailPath = `library/${userId}/thumbs/${timestamp}.jpg`;
      await supabase.storage.from(BUCKET).upload(thumbnailPath, thumbnailBlob, {
        upsert: true,
        contentType: "image/jpeg",
      });
    } catch {
      // Thumbnail is optional.
    }
  })();

  try {
    const thumbnailBlob = await Promise.race([
      captureVideoThumbnail(file),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 2500),
      ),
    ]);
    const thumbnailPath = `library/${userId}/thumbs/${timestamp}.jpg`;
    const { error: thumbError } = await supabase.storage
      .from(BUCKET)
      .upload(thumbnailPath, thumbnailBlob, {
        upsert: true,
        contentType: "image/jpeg",
      });
    if (!thumbError) {
      const { data: thumbPublic } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(thumbnailPath);
      thumbnailUrl = thumbPublic.publicUrl;
    }
  } catch {
    // Video upload succeeds without thumbnail preview.
  }

  return {
    videoUrl: videoPublic.publicUrl,
    videoPath,
    thumbnailUrl,
    error: null as Error | null,
  };
}

export async function removeExerciseLibraryStorage(paths: string[]) {
  const cleaned = paths.filter(Boolean);
  if (cleaned.length === 0) return { error: null as Error | null };

  const { error } = await supabase.storage.from(BUCKET).remove(cleaned);
  return { error };
}
