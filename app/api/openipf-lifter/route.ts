import { NextRequest, NextResponse } from "next/server";
import { getBestOpenIpfResult } from "@/lib/openipf";

export async function GET(request: NextRequest) {
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
