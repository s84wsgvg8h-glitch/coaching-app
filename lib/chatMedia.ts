import { supabase } from "@/lib/supabaseClient";
import { getReplyText, type ChatMessage } from "@/lib/chatUtils";
import { uploadFileViaApi } from "@/lib/storage/clientUpload";
import type { StorageMetadataFields } from "@/lib/storage/types";

const MAX_SIZE_MB = 100;

export type ChatMediaFileType = "image" | "video" | "audio";

export function getChatMediaFileType(file: File): ChatMediaFileType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "m4a" || extension === "aac" || extension === "mp3") {
    return "audio";
  }
  if (extension === "webm" || extension === "ogg") {
    return "audio";
  }

  return null;
}

export async function uploadChatMedia(userId: string, file: File) {
  const fileType = getChatMediaFileType(file);

  if (!fileType) {
    return {
      url: null as string | null,
      fileType: null as ChatMediaFileType | null,
      storage: null,
      error: new Error("Kies een foto of video"),
    };
  }

  const maxSizeBytes = MAX_SIZE_MB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      url: null as string | null,
      fileType: null as ChatMediaFileType | null,
      storage: null,
      error: new Error(`Bestand is te groot. Maximaal ${MAX_SIZE_MB} MB.`),
    };
  }

  const result = await uploadFileViaApi({
    file,
    filename: file.name,
    uploadType: "chat-media",
  });

  if (result.error || !result.url) {
    return {
      url: null as string | null,
      fileType: null as ChatMediaFileType | null,
      storage: null,
      error: result.error || new Error("Upload mislukt."),
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
