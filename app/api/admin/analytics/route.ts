import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/adminApiAuth";
import {
  fetchActiveUsers30d,
  fetchCoachPerformance,
  fetchGrowthAnalytics,
  fetchInvulscoreOverview,
  fetchPlatformStats,
} from "@/lib/adminAnalytics";

export async function GET(request: Request) {
  try {
    const access = await assertAdmin(request);
    if (!access.admin) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const [
      platform,
      invulscore,
      coachPerformance,
      growth,
      activeUsers30d,
    ] = await Promise.all([
      fetchPlatformStats(access.admin),
      fetchInvulscoreOverview(access.admin),
      fetchCoachPerformance(access.admin),
      fetchGrowthAnalytics(access.admin),
      fetchActiveUsers30d(access.admin),
    ]);

    return NextResponse.json({
      platform,
      invulscore,
      coachPerformance,
      growth,
      activeUsers30d,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Analytics laden mislukt.",
      },
      { status: 500 },
    );
  }
}
