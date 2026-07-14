import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { openipfLeaderboardSchema, parseJsonBody } from "@/lib/apiValidation";
import { checkRateLimit } from "@/lib/rateLimit";
import { getLifterDataBatch } from "@/lib/openipf";

export const maxDuration = 60;

const MAX_NAMES_PER_REQUEST = 12;

export async function POST(request: NextRequest) {
  const auth = await assertAuthenticatedActive(request);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rate = checkRateLimit(`openipf-leaderboard:${auth.user.id}`, {
    max: 10,
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

  const parsed = await parseJsonBody(request, openipfLeaderboardSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const names = [
    ...new Set((parsed.data.names || []).map((name) => name.trim()).filter(Boolean)),
  ];

  if (names.length === 0) {
    return NextResponse.json({ results: {} });
  }

  if (names.length > MAX_NAMES_PER_REQUEST) {
    return NextResponse.json(
      { error: `Maximaal ${MAX_NAMES_PER_REQUEST} namen per request` },
      { status: 400 },
    );
  }

  try {
    const results = await getLifterDataBatch(names, 20);

    return NextResponse.json({
      results: Object.fromEntries(results),
    });
  } catch (error) {
    console.error("[openipf-leaderboard]", error);
    return NextResponse.json(
      { error: "OpenIPF data ophalen mislukt" },
      { status: 500 },
    );
  }
}
