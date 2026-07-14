import { getApiAuthHeaders } from "@/lib/apiClient";
import {
  formatStorageFetchFailure,
  parseStorageApiResponse,
} from "@/lib/storage/clientApiParse";
import type {
  StorageProvider,
  StorageUploadResult,
  StorageUploadType,
  UploadContext,
} from "@/lib/storage/types";

export type PresignedUploadResult = StorageUploadResult & {
  error: Error | null;
};

type PresignApiSuccess = StorageUploadResult & {
  ok?: boolean;
  presignedUrl?: string;
};

function failedPresignedUpload(error: string): PresignedUploadResult {
  return {
    url: "",
    path: "",
    bucket: "",
    provider: "r2",
    contentType: "",
    size: 0,
    error: new Error(error),
  };
}

function getFileType(file: File | Blob) {
  return file instanceof File && file.type
    ? file.type
    : "application/octet-stream";
}

function getFileSize(file: File | Blob) {
  return typeof file.size === "number" && file.size >= 0 ? file.size : 0;
}

/**
 * Presigned R2 upload flow:
 * 1. Request presigned PUT URL from /api/storage/presign-upload
 * 2. PUT file directly to R2
 * 3. Return public URL + metadata from presign response
 */
export async function uploadFilePresigned(params: {
  file: File | Blob;
  filename: string;
  uploadType: StorageUploadType;
  context?: UploadContext;
}): Promise<PresignedUploadResult> {
  const contentType = getFileType(params.file);
  const fileSize = getFileSize(params.file);
  const presignUrl = "/api/storage/presign-upload";

  let response: Response;
  try {
    response = await fetch(presignUrl, {
      method: "POST",
      headers: {
        ...(await getApiAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uploadType: params.uploadType,
        filename: params.filename,
        contentType,
        size: fileSize,
        context: params.context || {},
      }),
    });
  } catch (error) {
    return failedPresignedUpload(
      formatStorageFetchFailure({
        stage: "presign-request",
        url: presignUrl,
        error,
      }),
    );
  }

  const parsed = await parseStorageApiResponse<PresignApiSuccess>(
    response,
    "presign-request",
  );

  if (!parsed.ok) {
    return failedPresignedUpload(parsed.error);
  }

  const presignedUrl = parsed.data.presignedUrl;
  if (!presignedUrl) {
    return failedPresignedUpload("Geen presigned upload URL ontvangen.");
  }

  let putResponse: Response;
  try {
    putResponse = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: params.file,
    });
  } catch (error) {
    return failedPresignedUpload(
      formatStorageFetchFailure({
        stage: "r2-put",
        url: presignedUrl.split("?")[0] || presignedUrl,
        error,
      }),
    );
  }

  if (!putResponse.ok) {
    const putText = await putResponse.text();
    return failedPresignedUpload(
      `[r2-put] HTTP ${putResponse.status} ${putResponse.statusText}: ${putText.slice(0, 200) || "R2 upload mislukt"}`,
    );
  }

  return {
    url: parsed.data.url,
    path: parsed.data.path,
    bucket: parsed.data.bucket,
    provider: parsed.data.provider as StorageProvider,
    contentType: parsed.data.contentType,
    size: parsed.data.size,
    error: null,
  };
}
