import { NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { parseJsonBody, storageDeleteSchema } from "@/lib/apiValidation";
import { deleteFile } from "@/lib/storage";
import { canDeleteStorageObject } from "@/lib/storage/permissions";

export const runtime = "nodejs";

function storageError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const auth = await assertAuthenticatedActive(request);
  if (auth.error || !auth.user || !auth.supabase) {
    return storageError(auth.error || "Je bent niet ingelogd", auth.status || 401);
  }

  try {
    const parsed = await parseJsonBody(request, storageDeleteSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const body = parsed.data;

    const allowed = await canDeleteStorageObject(auth.supabase, auth.user, {
      provider: body.provider,
      bucket: body.bucket,
      path: body.path,
      uploadType: body.uploadType,
      ownerUserId: body.ownerUserId,
      athleteId: body.athleteId,
    });

    if (!allowed) {
      return storageError("Geen toestemming.", 403);
    }

    await deleteFile(auth.supabase, {
      provider: body.provider,
      bucket: body.bucket,
      path: body.path,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return storageError(
      error instanceof Error ? error.message : "Verwijderen mislukt.",
      500,
    );
  }
}
