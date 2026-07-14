import { NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { uploadFile } from "@/lib/storage";
import { buildStoragePath } from "@/lib/storage/paths";
import { canUploadType } from "@/lib/storage/permissions";
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

    const rate = checkRateLimit(`storage-upload:${auth.user.id}`, {
      max: 20,
      windowMs: 60_000,
    });
    if (!rate.ok) {
      return storageError("Te veel uploads. Probeer later opnieuw.", 429);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const uploadType = formData.get("uploadType");
    const contextRaw = formData.get("context");
    const upsert = formData.get("upsert") === "true";

    if (!(file instanceof File)) {
      return storageError("Geen bestand ontvangen.", 400);
    }

    if (typeof uploadType !== "string" || !UPLOAD_TYPES.includes(uploadType as StorageUploadType)) {
      return storageError("Ongeldig upload type.", 400);
    }

    const typedUploadType = uploadType as StorageUploadType;
    let context: UploadContext = {};

    if (typeof contextRaw === "string" && contextRaw.trim()) {
      context = JSON.parse(contextRaw) as UploadContext;
    }

    const allowed = await canUploadType(auth.supabase, auth.user, typedUploadType, {
      athleteId: context.athleteId,
      reviewId: context.reviewId,
    });

    if (!allowed) {
      return storageError("Geen toestemming.", 403);
    }

    if (
      typedUploadType === "exercise-videos" &&
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
      typedUploadType,
      {
        size: file.size,
        type: file.type,
        name: file.name,
      },
      { isThumbnail: context.isThumbnail },
    );

    if (!validation.ok) {
      return storageError(validation.error, 400);
    }

    const { bucket, path, objectKey } = buildStoragePath(
      typedUploadType,
      auth.user.id,
      file.name,
      context,
    );

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadFile({
      supabase: auth.supabase,
      bucket,
      path,
      objectKey,
      body: buffer,
      contentType: file.type || "application/octet-stream",
      upsert,
    });

    return NextResponse.json({
      ok: true,
      url: result.url,
      path: result.path,
      bucket: result.bucket,
      provider: result.provider,
      contentType: result.contentType,
      size: result.size,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
