import { NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { parseJsonBody, storageMultipartAbortSchema } from "@/lib/apiValidation";
import { getStorageProvider } from "@/lib/storage";
import { abortR2MultipartUpload } from "@/lib/storage/r2Multipart";

export const runtime = "nodejs";

function storageError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  try {
    const auth = await assertAuthenticatedActive(request);
    if (auth.error || !auth.user) {
      return storageError(auth.error || "Je bent niet ingelogd", auth.status || 401);
    }

    if (getStorageProvider() !== "r2") {
      return storageError("Multipart upload vereist STORAGE_PROVIDER=r2.", 400);
    }

    const parsed = await parseJsonBody(request, storageMultipartAbortSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    await abortR2MultipartUpload({
      objectKey: parsed.data.objectKey,
      uploadId: parsed.data.uploadId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return storageError(
      error instanceof Error ? error.message : "Multipart abort mislukt.",
      500,
    );
  }
}
