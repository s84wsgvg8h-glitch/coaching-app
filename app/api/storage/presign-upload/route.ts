import { NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { parseJsonBody, storagePresignSchema } from "@/lib/apiValidation";
import { checkRateLimit } from "@/lib/rateLimit";
import { getStorageProvider } from "@/lib/storage";
import { buildStoragePath } from "@/lib/storage/paths";
import { canUploadType } from "@/lib/storage/permissions";
import { createR2PresignedPutUrl } from "@/lib/storage/r2";
import type { StorageUploadType, UploadContext } from "@/lib/storage/types";
import { validateStorageFile } from "@/lib/storage/validation";
import { isCoachLikeRole, isAdminRole } from "@/lib/authRoles";

export const runtime = "nodejs";

const UPLOAD_TYPES: StorageUploadType[] = [
  "chat-media",
  "exercise-videos",
  "exercise-library",
  "avatars",
  "merch-images",
];

function storageError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function assertAthleteVideoAccess(
  supabase: NonNullable<Awaited<ReturnType<typeof assertAuthenticatedActive>>["supabase"]>,
  userId: string,
  athleteId: string,
) {
  if (userId === athleteId) return true;

  const [{ data: actor }, { data: athlete }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
    supabase
      .from("profiles")
      .select("coach_id")
      .eq("id", athleteId)
      .maybeSingle(),
  ]);

  const isCoach =
    isCoachLikeRole(actor?.role) || isAdminRole(actor?.role);
  return isCoach && athlete?.coach_id === userId;
}

export async function POST(request: Request) {
  try {
    const auth = await assertAuthenticatedActive(request);
    if (auth.error || !auth.user || !auth.supabase) {
      return storageError(auth.error || "Je bent niet ingelogd", auth.status || 401);
    }

    const rate = checkRateLimit(`storage-presign:${auth.user.id}`, {
      max: 30,
      windowMs: 60_000,
    });
    if (!rate.ok) {
      return storageError("Te veel upload-verzoeken. Probeer later opnieuw.", 429);
    }

    if (getStorageProvider() !== "r2") {
      return storageError(
        "Presigned upload is alleen beschikbaar met STORAGE_PROVIDER=r2.",
        400,
      );
    }

    const parsed = await parseJsonBody(request, storagePresignSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const body = parsed.data;
    const uploadType = body.uploadType;
    const filename = body.filename?.trim() || "upload.bin";
    const contentType = body.contentType?.trim() || "application/octet-stream";
    const size = body.size ?? 0;
    const context = body.context || {};

    const allowed = await canUploadType(auth.supabase, auth.user, uploadType, {
      athleteId: context.athleteId,
      reviewId: context.reviewId,
    });

    if (!allowed) {
      return storageError("Geen toestemming.", 403);
    }

    if (
      uploadType === "exercise-videos" &&
      context.athleteId &&
      !(await assertAthleteVideoAccess(
        auth.supabase,
        auth.user.id,
        context.athleteId,
      ))
    ) {
      return storageError("Geen toestemming.", 403);
    }

    const validation = validateStorageFile(
      uploadType,
      { size, type: contentType, name: filename },
      { isThumbnail: context.isThumbnail },
    );

    if (!validation.ok) {
      return storageError(validation.error, 400);
    }

    const { objectKey } = buildStoragePath(
      uploadType,
      auth.user.id,
      filename,
      context,
    );

    const presigned = await createR2PresignedPutUrl({
      objectKey,
      contentType,
    });

    return NextResponse.json({
      ok: true,
      presignedUrl: presigned.presignedUrl,
      url: presigned.publicUrl,
      path: presigned.path,
      bucket: presigned.bucket,
      provider: "r2" as const,
      contentType,
      size,
    });
  } catch (error) {
    return storageError(
      error instanceof Error ? error.message : "Presigned URL mislukt.",
      500,
    );
  }
}
