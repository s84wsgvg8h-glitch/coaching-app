import { NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { parseJsonBody, storageSignedUrlSchema } from "@/lib/apiValidation";
import { checkRateLimit } from "@/lib/rateLimit";
import { getSignedUrl } from "@/lib/storage";
import { canReadStorageObject } from "@/lib/storage/permissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await assertAuthenticatedActive(request);
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rate = checkRateLimit(`storage-signed-url:${auth.user.id}`, {
    max: 120,
    windowMs: 60_000,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer later opnieuw." },
      {
        status: 429,
        headers: rate.retryAfterMs
          ? { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) }
          : undefined,
      },
    );
  }

  try {
    const parsed = await parseJsonBody(request, storageSignedUrlSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const body = parsed.data;
    const provider = body.provider?.trim();
    const path = body.path?.trim() || "";
    const legacyUrl = body.legacyUrl?.trim() || null;

    const allowed = await canReadStorageObject(auth.supabase, auth.user, {
      provider: provider || (path ? "r2" : "supabase"),
      path: path || legacyUrl || "",
      bucket: body.bucket?.trim(),
      legacyUrl,
    });

    if (!allowed) {
      return NextResponse.json({ error: "Geen toegang tot dit bestand." }, { status: 403 });
    }

    const url = await getSignedUrl(auth.supabase, body);

    if (!url) {
      return NextResponse.json(
        { error: "Geen playback URL beschikbaar." },
        { status: 404 },
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Signed URL mislukt.",
      },
      { status: 500 },
    );
  }
}
