import { NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { getStorageProvider } from "@/lib/storage";
import { MULTIPART_PART_SIZE_BYTES } from "@/lib/storage/uploadStrategy";
import { uploadR2MultipartPart } from "@/lib/storage/r2Multipart";

export const runtime = "nodejs";
export const maxDuration = 60;

function storageError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  try {
    const auth = await assertAuthenticatedActive(request);
    if (auth.error || !auth.user) {
      return storageError(auth.error || "Je bent niet ingelogd", auth.status || 401);
    }

    const rate = checkRateLimit(`storage-multipart-part:${auth.user.id}`, {
      max: 120,
      windowMs: 60_000,
    });
    if (!rate.ok) {
      return storageError("Te veel upload-verzoeken. Probeer later opnieuw.", 429);
    }

    if (getStorageProvider() !== "r2") {
      return storageError("Multipart upload vereist STORAGE_PROVIDER=r2.", 400);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const uploadId = formData.get("uploadId");
    const objectKey = formData.get("objectKey");
    const partNumberRaw = formData.get("partNumber");

    if (!(file instanceof File)) {
      return storageError("Geen bestandsdeel ontvangen.", 400);
    }

    if (typeof uploadId !== "string" || !uploadId.trim()) {
      return storageError("Upload ID ontbreekt.", 400);
    }

    if (typeof objectKey !== "string" || !objectKey.trim()) {
      return storageError("Object key ontbreekt.", 400);
    }

    const partNumber =
      typeof partNumberRaw === "string" ? Number.parseInt(partNumberRaw, 10) : NaN;

    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000) {
      return storageError("Ongeldig partnummer.", 400);
    }

    if (file.size <= 0 || file.size > MULTIPART_PART_SIZE_BYTES) {
      return storageError(
        `Deel is te groot (max ${Math.round(MULTIPART_PART_SIZE_BYTES / (1024 * 1024))} MB).`,
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const part = await uploadR2MultipartPart({
      objectKey,
      uploadId: uploadId.trim(),
      partNumber,
      body: buffer,
    });

    return NextResponse.json({
      ok: true,
      partNumber: part.partNumber,
      etag: part.etag,
    });
  } catch (error) {
    return storageError(
      error instanceof Error ? error.message : "Multipart deel uploaden mislukt.",
      500,
    );
  }
}
