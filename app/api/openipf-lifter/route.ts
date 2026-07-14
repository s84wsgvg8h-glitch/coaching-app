import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { getBestOpenIpfResult } from "@/lib/openipf";

export async function GET(request: NextRequest) {
  const auth = await assertAuthenticatedActive(request);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rate = checkRateLimit(`openipf-lifter:${auth.user.id}`, {
    max: 30,
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

  const name = request.nextUrl.searchParams.get("name");

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Naam is verplicht" },
      { status: 400 },
    );
  }

  const result = await getBestOpenIpfResult(name.trim());

  return NextResponse.json({ result });
}
