import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticated } from "@/lib/apiAuth";
import { getBestOpenIpfResult } from "@/lib/openipf";

export async function GET(request: NextRequest) {
  const auth = await assertAuthenticated(request);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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
