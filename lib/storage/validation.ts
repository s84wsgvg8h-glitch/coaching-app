import type { StorageUploadType } from "@/lib/storage/types";

type ValidationRule = {
  maxBytes: number;
  allowedMimePrefixes: string[];
  allowedExtensions?: string[];
};

const RULES: Record<StorageUploadType, ValidationRule> = {
  "chat-media": {
    maxBytes: 100 * 1024 * 1024,
    allowedMimePrefixes: ["image/", "video/", "audio/"],
    allowedExtensions: ["m4a", "aac", "mp3", "webm", "ogg"],
  },
  "exercise-videos": {
    maxBytes: 250 * 1024 * 1024,
    allowedMimePrefixes: ["video/", "image/"],
    allowedExtensions: ["mp4", "mov", "m4v", "webm", "3gp"],
  },
  "exercise-library": {
    maxBytes: 250 * 1024 * 1024,
    allowedMimePrefixes: ["video/", "image/"],
  },
  avatars: {
    maxBytes: 10 * 1024 * 1024,
    allowedMimePrefixes: ["image/"],
  },
  "merch-images": {
    maxBytes: 10 * 1024 * 1024,
    allowedMimePrefixes: ["image/"],
  },
};

export function validateStorageFile(
  uploadType: StorageUploadType,
  file: { size: number; type: string; name: string },
  context: { isThumbnail?: boolean } = {},
) {
  const rule = RULES[uploadType];
  if (file.size <= 0) {
    return { ok: false as const, error: "Leeg bestand." };
  }
  if (file.size > rule.maxBytes) {
    return {
      ok: false as const,
      error: `Bestand is te groot (max ${Math.round(rule.maxBytes / (1024 * 1024))} MB).`,
    };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeOk =
    rule.allowedMimePrefixes.some((prefix) => file.type.startsWith(prefix)) ||
    rule.allowedExtensions?.includes(extension);

  if (!mimeOk && !context.isThumbnail) {
    return { ok: false as const, error: "Bestandstype niet toegestaan." };
  }

  if (context.isThumbnail && !file.type.startsWith("image/")) {
    return { ok: false as const, error: "Thumbnail moet een afbeelding zijn." };
  }

  return { ok: true as const };
}
