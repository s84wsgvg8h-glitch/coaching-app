import { NextResponse } from "next/server";
import { assertCoachLike } from "@/lib/coachApiAuth";
import { coachCopilotSchema, parseJsonBody } from "@/lib/apiValidation";
import { withRequestLog } from "@/lib/logger";

export async function POST(request: Request) {
  const access = await assertCoachLike(request);
  if (!access.db || !access.userId) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  const log = withRequestLog("coach-copilot", access.userId);
  const parsed = await parseJsonBody(request, coachCopilotSchema);
  if (!parsed.success) {
    log.failure("validation");
    return parsed.response;
  }

  const summary = (parsed.data.summary || "Geen teamdata beschikbaar.").slice(
    0,
    4000,
  );
  const count = Math.min(Math.max(parsed.data.athleteCount ?? 0, 0), 10_000);

  const digest = [
    `Weekdigest (${count} atleten)`,
    "",
    summary,
    "",
    "Actie: check atleten met lage invulscore en plan check-ins.",
  ].join("\n");

  log.success({ athleteCount: count });
  return NextResponse.json({ digest });
}
