import { NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { parseJsonBody, storageMultipartCompleteSchema } from "@/lib/apiValidation";
import { checkRateLimit } from "@/lib/rateLimit";
import { getStorageProvider } from "@/lib/storage";
import { completeR2MultipartUpload } from "@/lib/storage/r2Multipart";

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

    const rate = checkRateLimit(`storage-multipart-complete:${auth.user.id}`, {
      max: 30,
      windowMs: 60_000,
    });
    if (!rate.ok) {
      return storageError("Te veel upload-verzoeken. Probeer later opnieuw.", 429);
    }

    if (getStorageProvider() !== "r2") {
      return storageError("Multipart upload vereist STORAGE_PROVIDER=r2.", 400);
    }

    const parsed = await parseJsonBody(request, storageMultipartCompleteSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const body = parsed.data;
    const result = await completeR2MultipartUpload({
      objectKey: body.objectKey,
      uploadId: body.uploadId,
      parts: body.parts,
      contentType: body.contentType,
      size: body.size,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return storageError(
      error instanceof Error ? error.message : "Multipart afronden mislukt.",
      500,
    );
  }
}
