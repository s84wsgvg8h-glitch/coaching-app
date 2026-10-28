import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Config } from "@/lib/storage/env";
import type { StorageDeleteInput, StorageUploadResult } from "@/lib/storage/types";

let r2Client: S3Client | null = null;

export function getR2Client() {
  const config = getR2Config();
  if (!config) {
    throw new Error("Cloudflare R2 is niet geconfigureerd.");
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return { client: r2Client, config };
}

export function getR2PublicUrl(objectKey: string) {
  const config = getR2Config();
  if (!config) return null;
  return `${config.publicUrl}/${objectKey.replace(/^\/+/, "")}`;
}

export async function listR2Objects(prefix?: string) {
  const { client, config } = getR2Client();
  const objects: { key: string; size?: number }[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix?.replace(/^\/+/, ""),
        ContinuationToken: continuationToken,
      }),
    );

    for (const item of response.Contents || []) {
      if (item.Key) {
        objects.push({ key: item.Key, size: item.Size });
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}

export async function deleteR2ObjectKey(key: string) {
  return deleteFromR2({ provider: "r2", bucket: "", path: key });
}

export async function uploadToR2(params: {
  objectKey: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<StorageUploadResult> {
  const { client, config } = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: params.objectKey.replace(/^\/+/, ""),
      Body: params.body,
      ContentType: params.contentType,
    }),
  );

  const path = params.objectKey.replace(/^\/+/, "");

  return {
    url: `${config.publicUrl}/${path}`,
    path,
    bucket: config.bucket,
    provider: "r2",
    contentType: params.contentType,
    size: params.body.byteLength,
  };
}

export async function deleteFromR2(input: StorageDeleteInput) {
  const { client, config } = getR2Client();
  const key = input.path.replace(/^\/+/, "");

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
}

export async function createR2PresignedPutUrl(params: {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const { client, config } = getR2Client();
  const key = params.objectKey.replace(/^\/+/, "");

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: params.contentType,
  });

  const presignedUrl = await getSignedUrl(client, command, {
    expiresIn: params.expiresInSeconds ?? 900,
  });

  return {
    presignedUrl,
    path: key,
    bucket: config.bucket,
    publicUrl: `${config.publicUrl}/${key}`,
  };
}

export async function getR2SignedUrl(objectKey: string) {
  const publicUrl = getR2PublicUrl(objectKey);
  if (!publicUrl) {
    throw new Error("R2 public URL is niet geconfigureerd.");
  }
  return publicUrl;
}
