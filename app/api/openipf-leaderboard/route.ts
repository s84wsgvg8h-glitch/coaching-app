import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticated } from "@/lib/apiAuth";
import { getLifterDataBatch } from "@/lib/openipf";

export const maxDuration = 60;

const MAX_NAMES_PER_REQUEST = 12;

export async function POST(request: NextRequest) {
  const auth = await assertAuthenticated(request);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { names?: string[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 });
  }

  const names = [...new Set((body.names || []).map((name) => name.trim()).filter(Boolean))];

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
