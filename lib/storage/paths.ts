import type { StorageUploadType, UploadContext } from "@/lib/storage/types";

function safeExtension(filename: string, fallback: string) {
  const raw = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return raw || fallback;
}

function timestampSlug() {
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

export function buildStoragePath(
  uploadType: StorageUploadType,
  userId: string,
  filename: string,
  context: UploadContext = {},
) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const stamp = timestampSlug();

  switch (uploadType) {
    case "chat-media": {
      const ext = safeExtension(filename, "bin");
      return {
        bucket: "chat-media",
        path: `${userId}/${year}/${month}/${stamp}.${ext}`,
        objectKey: `chat-media/${userId}/${year}/${month}/${stamp}.${ext}`,
      };
    }
    case "merch-images": {
      const ext = safeExtension(filename, "jpg");
      return {
        bucket: "chat-media",
        path: `merch/${userId}/${stamp}.${ext}`,
        objectKey: `merch-images/${userId}/${stamp}.${ext}`,
      };
    }
    case "avatars": {
      const scope = (context.scope || "avatar").replace(/[^a-z0-9_-]/gi, "");
      const ext = safeExtension(filename, "jpg");
      return {
        bucket: "avatars",
        path: `${userId}/${scope}-${Date.now()}.${ext}`,
        objectKey: `avatars/${userId}/${scope}-${Date.now()}.${ext}`,
      };
    }
    case "exercise-library": {
      const ext = safeExtension(filename, "mp4");
      if (context.isThumbnail) {
        return {
          bucket: "exercise-library",
          path: `library/${userId}/thumbs/${Date.now()}.jpg`,
          objectKey: `exercise-library/${userId}/thumbs/${Date.now()}.jpg`,
        };
      }
      return {
        bucket: "exercise-library",
        path: `library/${userId}/${Date.now()}.${ext}`,
        objectKey: `exercise-library/${userId}/${Date.now()}.${ext}`,
      };
    }
    case "exercise-videos": {
      const athleteId = context.athleteId || userId;
      const exerciseId = context.exerciseId || "exercise";
      const setNumber = context.setNumber ?? 1;
      if (context.isThumbnail) {
        return {
          bucket: "exercise-videos",
          path: `${athleteId}/${exerciseId}/set-${setNumber}/thumb-${Date.now()}.jpg`,
          objectKey: `exercise-videos/${athleteId}/${exerciseId}/set-${setNumber}/thumb-${Date.now()}.jpg`,
        };
      }
      if (context.reviewId) {
        const ext = safeExtension(filename, "bin");
        return {
          bucket: "exercise-videos",
          path: `${userId}/review-feedback/${context.reviewId}/${stamp}.${ext}`,
          objectKey: `exercise-videos/${userId}/review-feedback/${context.reviewId}/${stamp}.${ext}`,
        };
      }
      const ext = safeExtension(filename, "mp4");
      const safeName = `${Date.now()}.${ext}`;
      return {
        bucket: "exercise-videos",
        path: `${athleteId}/${exerciseId}/set-${setNumber}/${safeName}`,
        objectKey: `exercise-videos/${athleteId}/${exerciseId}/set-${setNumber}/${safeName}`,
      };
    }
    default:
      throw new Error("Onbekend upload type.");
  }
}
