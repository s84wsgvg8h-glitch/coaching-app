import { getApiAuthHeaders } from "@/lib/apiClient";
import {
  formatStorageFetchFailure,
  parseStorageApiResponse,
} from "@/lib/storage/clientApiParse";
import type {
  StorageUploadResult,
  StorageUploadType,
  UploadContext,
} from "@/lib/storage/types";
import { MULTIPART_PART_SIZE_BYTES } from "@/lib/storage/uploadStrategy";

export type MultipartUploadResult = StorageUploadResult & {
  error: Error | null;
};

function failedMultipartUpload(error: string): MultipartUploadResult {
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
 * Same-origin multipart upload for native iOS when direct R2 PUT is blocked.
 * Each part is POSTed to our API, which forwards to R2 (no cross-origin CORS).
 */
export async function uploadFileMultipartViaApi(params: {
  file: File | Blob;
  filename: string;
  uploadType: StorageUploadType;
  context?: UploadContext;
}): Promise<MultipartUploadResult> {
  const contentType = getFileType(params.file);
  const fileSize = getFileSize(params.file);

  let initResponse: Response;
  try {
    initResponse = await fetch("/api/storage/multipart/init", {
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
    return failedMultipartUpload(
      formatStorageFetchFailure({
        stage: "multipart-init",
        url: "/api/storage/multipart/init",
        error,
      }),
    );
  }

  const parsed = await parseStorageApiResponse<{
    uploadId: string;
    path: string;
    url: string;
    bucket: string;
    provider: string;
    contentType: string;
    size: number;
  }>(initResponse, "multipart-init");

  if (!parsed.ok) {
    return failedMultipartUpload(parsed.error);
  }

  const { uploadId, path, url, bucket, contentType: storedType, size } =
    parsed.data;
  const parts: Array<{ partNumber: number; etag: string }> = [];
  const totalParts = Math.max(1, Math.ceil(fileSize / MULTIPART_PART_SIZE_BYTES));

  try {
    for (let partIndex = 0; partIndex < totalParts; partIndex += 1) {
      const start = partIndex * MULTIPART_PART_SIZE_BYTES;
      const end = Math.min(start + MULTIPART_PART_SIZE_BYTES, fileSize);
      const chunk = params.file.slice(start, end);
      const partNumber = partIndex + 1;

      const formData = new FormData();
      formData.append("file", chunk, `${params.filename}.part${partNumber}`);
      formData.append("uploadId", uploadId);
      formData.append("objectKey", path);
      formData.append("partNumber", String(partNumber));

      let partResponse: Response;
      try {
        partResponse = await fetch("/api/storage/multipart/part", {
          method: "POST",
          headers: await getApiAuthHeaders(),
          body: formData,
        });
      } catch (error) {
        throw new Error(
          formatStorageFetchFailure({
            stage: "multipart-part",
            url: "/api/storage/multipart/part",
            error,
          }),
        );
      }

      const partParsed = await parseStorageApiResponse<{
        partNumber: number;
        etag: string;
      }>(partResponse, "multipart-part");

      if (!partParsed.ok) {
        throw new Error(partParsed.error);
      }

      parts.push({
        partNumber: partParsed.data.partNumber,
        etag: partParsed.data.etag,
      });
    }

    let completeResponse: Response;
    try {
      completeResponse = await fetch("/api/storage/multipart/complete", {
        method: "POST",
        headers: {
          ...(await getApiAuthHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uploadId,
          objectKey: path,
          parts,
          contentType: storedType || contentType,
          size,
        }),
      });
    } catch (error) {
      throw new Error(
        formatStorageFetchFailure({
          stage: "multipart-complete",
          url: "/api/storage/multipart/complete",
          error,
        }),
      );
    }

    const completeParsed = await parseStorageApiResponse<StorageUploadResult>(
      completeResponse,
      "multipart-complete",
    );

    if (!completeParsed.ok) {
      throw new Error(completeParsed.error);
    }

    return {
      ...completeParsed.data,
      url: completeParsed.data.url || url,
      path: completeParsed.data.path || path,
      bucket: completeParsed.data.bucket || bucket,
      provider: "r2",
      error: null,
    };
  } catch (error) {
    try {
      await fetch("/api/storage/multipart/abort", {
        method: "POST",
        headers: {
          ...(await getApiAuthHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uploadId, objectKey: path }),
      });
    } catch {
      // Best-effort cleanup.
    }

    return failedMultipartUpload(
      error instanceof Error ? error.message : "Multipart upload mislukt.",
    );
  }
}
