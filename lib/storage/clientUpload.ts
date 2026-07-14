import { getApiAuthHeaders } from "@/lib/apiClient";
import {
  formatStorageFetchFailure,
  parseStorageApiResponse,
} from "@/lib/storage/clientApiParse";
import { uploadFilePresigned } from "@/lib/storage/clientPresignedUpload";
import {
  canUseDirectApiUpload,
  shouldUsePresignedUpload,
} from "@/lib/storage/uploadStrategy";
import type {
  StorageUploadResult,
  StorageUploadType,
  UploadContext,
} from "@/lib/storage/types";

export type ClientUploadResult = StorageUploadResult & {
  error: Error | null;
};

const EMPTY_RESULT: ClientUploadResult = {
  url: "",
  path: "",
  bucket: "",
  provider: "supabase",
  contentType: "",
  size: 0,
  error: null,
};

function failedUpload(error: string): ClientUploadResult {
  return { ...EMPTY_RESULT, error: new Error(error) };
}

function getFileSize(file: File | Blob) {
  return typeof file.size === "number" && file.size >= 0 ? file.size : 0;
}

type UploadApiSuccess = StorageUploadResult & { ok?: boolean };

function isPresignUnavailableError(message: string) {
  return (
    message.includes("STORAGE_PROVIDER=r2") ||
    message.includes("Presigned upload is alleen beschikbaar")
  );
}

async function uploadFileDirect(params: {
  file: File | Blob;
  filename: string;
  uploadType: StorageUploadType;
  context?: UploadContext;
  upsert?: boolean;
}): Promise<ClientUploadResult> {
  const fileSize = getFileSize(params.file);
  const requestUrl = "/api/storage/upload";

  if (!canUseDirectApiUpload(fileSize)) {
    return failedUpload(
      `Bestand is te groot (${Math.round(fileSize / (1024 * 1024))} MB) voor directe upload via Vercel (max ~4 MB).`,
    );
  }

  const formData = new FormData();
  formData.append("file", params.file, params.filename);
  formData.append("uploadType", params.uploadType);
  if (params.context) {
    formData.append("context", JSON.stringify(params.context));
  }
  if (params.upsert) {
    formData.append("upsert", "true");
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "POST",
      headers: await getApiAuthHeaders(),
      body: formData,
    });
  } catch (error) {
    return failedUpload(
      formatStorageFetchFailure({
        stage: "direct-upload",
        url: requestUrl,
        error,
      }),
    );
  }

  const parsed = await parseStorageApiResponse<UploadApiSuccess>(
    response,
    "direct-upload",
  );

  if (!parsed.ok) {
    return failedUpload(parsed.error);
  }

  const { ok: _ok, ...result } = parsed.data;
  return { ...result, error: null };
}

export async function uploadFileViaApi(params: {
  file: File | Blob;
  filename: string;
  uploadType: StorageUploadType;
  context?: UploadContext;
  upsert?: boolean;
}): Promise<ClientUploadResult> {
  try {
    const fileSize = getFileSize(params.file);

    if (shouldUsePresignedUpload(params.uploadType, fileSize)) {
      const presignedResult = await uploadFilePresigned(params);
      if (!presignedResult.error) {
        return presignedResult;
      }

      if (
        isPresignUnavailableError(presignedResult.error.message) &&
        canUseDirectApiUpload(fileSize)
      ) {
        return uploadFileDirect(params);
      }

      return presignedResult;
    }

    return uploadFileDirect(params);
  } catch (error) {
    return failedUpload(
      error instanceof Error ? error.message : "Upload mislukt.",
    );
  }
}

export async function deleteFileViaApi(params: {
  provider: "r2" | "supabase";
  bucket: string;
  path: string;
  uploadType?: StorageUploadType;
  ownerUserId?: string;
  athleteId?: string;
}) {
  let response: Response;
  try {
    response = await fetch("/api/storage/delete", {
      method: "POST",
      headers: {
        ...(await getApiAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
  } catch (error) {
    return {
      error: new Error(
        formatStorageFetchFailure({
          stage: "delete",
          url: "/api/storage/delete",
          error,
        }),
      ),
    };
  }

  const parsed = await parseStorageApiResponse<{ ok?: boolean }>(
    response,
    "delete",
  );
  if (!parsed.ok) {
    return { error: new Error(parsed.error) };
  }

  return { error: null as Error | null };
}

export async function getSignedUrlViaApi(params: {
  provider?: string | null;
  bucket?: string | null;
  path?: string | null;
  legacyUrl?: string | null;
}) {
  let response: Response;
  try {
    response = await fetch("/api/storage/signed-url", {
      method: "POST",
      headers: {
        ...(await getApiAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
  } catch (error) {
    return {
      url: null as string | null,
      error: new Error(
        formatStorageFetchFailure({
          stage: "signed-url",
          url: "/api/storage/signed-url",
          error,
        }),
      ),
    };
  }

  const parsed = await parseStorageApiResponse<{ url?: string }>(
    response,
    "signed-url",
  );
  if (!parsed.ok) {
    return { url: null as string | null, error: new Error(parsed.error) };
  }

  return { url: parsed.data.url || null, error: null as Error | null };
}

export { uploadFilePresigned } from "@/lib/storage/clientPresignedUpload";
