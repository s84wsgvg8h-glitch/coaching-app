import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/adminApiAuth";
import { fetchTableCounts } from "@/lib/adminAnalytics";
import { loadRecentCalendarSyncLogs } from "@/lib/calendarSyncLog";
import { getStripeCoachingHealthChecks } from "@/lib/stripeCoachingHealth";

export async function GET(request: Request) {
  try {
    const access = await assertAdmin(request);
    if (!access.admin) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const [tableCounts, syncLogs] = await Promise.all([
      fetchTableCounts(access.admin),
      loadRecentCalendarSyncLogs(access.admin, 20),
    ]);

    const lastSync = syncLogs[0] ?? null;
    const checks = {
      supabaseConfigured: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.SUPABASE_SERVICE_ROLE_KEY,
      ),
      serviceRolePresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      cronSecretPresent: Boolean(process.env.CRON_SECRET),
      stripeCoaching: getStripeCoachingHealthChecks(),
    };

    return NextResponse.json({
      tableCounts,
      lastSync,
      syncLogs,
      checks,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Health check mislukt.",
      },
      { status: 500 },
    );
  }
}
