import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getR2Client } from "@/lib/storage/r2";
import type { StorageUploadResult } from "@/lib/storage/types";

export async function createR2MultipartUpload(params: {
  objectKey: string;
  contentType: string;
}) {
  const { client, config } = getR2Client();
  const key = params.objectKey.replace(/^\/+/, "");

  const response = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: params.contentType,
    }),
  );

  if (!response.UploadId) {
    throw new Error("Multipart upload kon niet worden gestart.");
  }

  return {
    uploadId: response.UploadId,
    path: key,
    bucket: config.bucket,
    publicUrl: `${config.publicUrl}/${key}`,
  };
}

export async function uploadR2MultipartPart(params: {
  objectKey: string;
  uploadId: string;
  partNumber: number;
  body: Buffer | Uint8Array;
}) {
  const { client, config } = getR2Client();
  const key = params.objectKey.replace(/^\/+/, "");

  const response = await client.send(
    new UploadPartCommand({
      Bucket: config.bucket,
      Key: key,
      UploadId: params.uploadId,
      PartNumber: params.partNumber,
      Body: params.body,
    }),
  );

  if (!response.ETag) {
    throw new Error(`Deel ${params.partNumber} uploaden mislukt.`);
  }

  return {
    partNumber: params.partNumber,
    etag: response.ETag,
  };
}

export async function completeR2MultipartUpload(params: {
  objectKey: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
  contentType: string;
  size: number;
}): Promise<StorageUploadResult> {
  const { client, config } = getR2Client();
  const key = params.objectKey.replace(/^\/+/, "");

  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: config.bucket,
      Key: key,
      UploadId: params.uploadId,
      MultipartUpload: {
        Parts: [...params.parts]
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((part) => ({
            PartNumber: part.partNumber,
            ETag: part.etag,
          })),
      },
    }),
  );

  return {
    url: `${config.publicUrl}/${key}`,
    path: key,
    bucket: config.bucket,
    provider: "r2",
    contentType: params.contentType,
    size: params.size,
  };
}

export async function abortR2MultipartUpload(params: {
  objectKey: string;
  uploadId: string;
}) {
  const { client, config } = getR2Client();
  const key = params.objectKey.replace(/^\/+/, "");

  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: config.bucket,
      Key: key,
      UploadId: params.uploadId,
    }),
  );
}
