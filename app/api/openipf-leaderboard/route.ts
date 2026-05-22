import { NextRequest, NextResponse } from "next/server";
import { getLifterDataBatch } from "@/lib/openipf";

export async function POST(request: NextRequest) {
  let body: { names?: string[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 });
  }

  const names = (body.names || []).map((name) => name.trim()).filter(Boolean);

  if (names.length === 0) {
    return NextResponse.json({ results: {} });
  }

  const results = await getLifterDataBatch(names);

  return NextResponse.json({
    results: Object.fromEntries(results),
  });
}
