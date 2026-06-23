import { NextResponse } from "next/server";
import { assertCoachLike } from "@/lib/coachApiAuth";

export async function POST(request: Request) {
  const access = await assertCoachLike(request);
  if (!access.db || !access.userId) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  let body: { summary?: string; athleteCount?: number };
  try {
    body = (await request.json()) as { summary?: string; athleteCount?: number };
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const summary = (body.summary || "Geen teamdata beschikbaar.").slice(0, 4000);
  const count = Math.min(Math.max(body.athleteCount ?? 0, 0), 10_000);

  const digest = [
    `Weekdigest (${count} atleten)`,
    "",
    summary,
    "",
    "Actie: check atleten met lage invulscore en plan check-ins.",
  ].join("\n");

  return NextResponse.json({ digest });
}
