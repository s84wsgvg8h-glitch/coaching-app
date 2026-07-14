import { NextResponse } from "next/server";
import { assertCoachLike } from "@/lib/coachApiAuth";
import { processDueBroadcasts } from "@/lib/scheduledBroadcasts";

export async function POST(request: Request) {
  const access = await assertCoachLike(request);
  if (!access.userId) {
    return NextResponse.json({ error: access.error || "Forbidden" }, { status: 403 });
  }

  const processed = await processDueBroadcasts(access.userId);
  return NextResponse.json({ processed });
}
