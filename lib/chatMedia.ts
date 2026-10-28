import { uploadChatMediaViaSupabase } from "@/lib/chatMediaSupabaseUpload";
import { getReplyText, type ChatMessage } from "@/lib/chatUtils";
import { isMobileUploadClient } from "@/lib/nativeKeyboard";
import { uploadFileViaApi } from "@/lib/storage/clientUpload";
import type { StorageUploadResult } from "@/lib/storage/types";
import { supabase } from "@/lib/supabaseClient";
import type { StorageMetadataFields } from "@/lib/storage/types";

const MAX_SIZE_MB = 100;

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "3gp", "webm", "mkv"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"]);
const AUDIO_EXTENSIONS = new Set(["m4a", "aac", "mp3", "webm", "ogg"]);

export type ChatMediaFileType = "image" | "video" | "audio";

function getFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || "";
}

function inferMimeTypeFromExtension(extension: string) {
  if (VIDEO_EXTENSIONS.has(extension)) {
    return extension === "mov" ? "video/quicktime" : "video/mp4";
  }
  if (IMAGE_EXTENSIONS.has(extension)) {
    return extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : extension === "gif"
          ? "image/gif"
          : "image/jpeg";
  }
  if (AUDIO_EXTENSIONS.has(extension)) {
    return extension === "mp3"
      ? "audio/mpeg"
      : extension === "ogg"
        ? "audio/ogg"
        : "audio/mp4";
  }
  return "";
}

export function getChatMediaFileType(file: File): ChatMediaFileType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";

  const extension = getFileExtension(file);
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";

  if (file.type === "application/octet-stream" && extension) {
    if (VIDEO_EXTENSIONS.has(extension)) return "video";
    if (IMAGE_EXTENSIONS.has(extension)) return "image";
    if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  }

  return null;
}

/**
 * iOS gallery/camera files often miss MIME type. Avoid reading large files fully
 * into memory — wrap the existing blob with corrected metadata when possible.
 */
export async function normalizeChatMediaFile(file: File): Promise<File> {
  const fileType = getChatMediaFileType(file);
  if (!fileType) {
    throw new Error("Kies een foto of video");
  }

  const extension = getFileExtension(file);
  const inferredType =
    file.type && file.type !== "application/octet-stream"
      ? file.type
      : inferMimeTypeFromExtension(extension) ||
        (fileType === "video"
          ? "video/mp4"
          : fileType === "audio"
            ? "audio/mp4"
            : "image/jpeg");

  const fallbackExtension =
    fileType === "video" ? "mp4" : fileType === "audio" ? "m4a" : "jpg";
  const name =
    file.name && file.name.includes(".")
      ? file.name
      : `${fileType}-${Date.now()}.${extension || fallbackExtension}`;

  if (file.size > 0) {
    if (file.type === inferredType && file.name === name) {
      return file;
    }
    return new File([file], name, { type: inferredType });
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error("Bestand is leeg of kon niet worden gelezen.");
  }

  return new File([buffer], name, { type: inferredType });
}

async function uploadNormalizedChatMedia(
  userId: string,
  normalizedFile: File,
): Promise<{ result: StorageUploadResult | null; error: Error | null }> {
  try {
    if (isMobileUploadClient()) {
      const result = await uploadChatMediaViaSupabase(userId, normalizedFile);
      return { result, error: null };
    }

    const apiResult = await uploadFileViaApi({
      file: normalizedFile,
      filename: normalizedFile.name,
      uploadType: "chat-media",
    });

    if (apiResult.error || !apiResult.url) {
      return {
        result: null,
        error: apiResult.error || new Error("Upload mislukt."),
      };
    }

    return { result: apiResult, error: null };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error : new Error("Upload mislukt."),
    };
  }
}

export async function uploadChatMedia(userId: string, file: File) {
  let normalizedFile: File;
  try {
    normalizedFile = await normalizeChatMediaFile(file);
  } catch (error) {
    return {
      url: null as string | null,
      fileType: null as ChatMediaFileType | null,
      storage: null,
      error:
        error instanceof Error
          ? error
          : new Error("Bestand kon niet worden voorbereid."),
    };
  }

  const fileType = getChatMediaFileType(normalizedFile);
  if (!fileType) {
    return {
      url: null as string | null,
      fileType: null as ChatMediaFileType | null,
      storage: null,
      error: new Error("Kies een foto of video"),
    };
  }

  const maxSizeBytes = MAX_SIZE_MB * 1024 * 1024;

  if (normalizedFile.size > maxSizeBytes) {
    return {
      url: null as string | null,
      fileType: null as ChatMediaFileType | null,
      storage: null,
      error: new Error(`Bestand is te groot. Maximaal ${MAX_SIZE_MB} MB.`),
    };
  }

  const { result, error } = await uploadNormalizedChatMedia(
    userId,
    normalizedFile,
  );

  if (error || !result?.url) {
    return {
      url: null as string | null,
      fileType: null as ChatMediaFileType | null,
      storage: null,
      error: error || new Error("Upload mislukt."),
    };
  }

  return {
    url: result.url,
    fileType,
    storage: result,
    error: null as Error | null,
  };
}

export async function uploadChatAudio(userId: string, blob: Blob, mimeType: string) {
  const normalizedMime =
    mimeType ||
    blob.type ||
    (typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? "audio/mp4"
      : "audio/webm");
  const extension =
    normalizedMime.includes("mp4") ||
    normalizedMime.includes("aac") ||
    normalizedMime.includes("m4a")
      ? "m4a"
      : normalizedMime.includes("ogg")
        ? "ogg"
        : "webm";
  const fileType = normalizedMime.startsWith("audio/")
    ? normalizedMime
    : `audio/${extension === "m4a" ? "mp4" : extension}`;
  const file = new File([blob], `voice-${Date.now()}.${extension}`, {
    type: fileType,
  });

  return uploadChatMedia(userId, file);
}

export async function insertChatMediaMessage(params: {
  userId: string;
  fileUrl: string;
  fileType: ChatMediaFileType;
  caption?: string;
  receiverId?: string;
  groupId?: string;
  replyTo?: ChatMessage | null;
  storage?: StorageMetadataFields | null;
}) {
  const base = {
    sender_id: params.userId,
    body: params.caption?.trim() || null,
    file_url: params.fileUrl,
    file_type: params.fileType,
    read_at: null,
    reply_to_body: params.replyTo ? getReplyText(params.replyTo) : null,
    reply_to_file_type: params.replyTo?.file_type || null,
    reply_to_sender_id: params.replyTo?.sender_id || null,
    ...(params.storage || {}),
  };

  if (params.groupId) {
    return supabase.from("messages").insert({
      ...base,
      group_id: params.groupId,
    });
  }

  return supabase.from("messages").insert({
    ...base,
    receiver_id: params.receiverId!,
  });
}
