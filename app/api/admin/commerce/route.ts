import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/adminApiAuth";

export async function GET(request: Request) {
  try {
    const access = await assertAdmin(request);
    if (!access.admin) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const admin = access.admin;

    const [{ data: orders, error: ordersError }, { count: totalOrders }] =
      await Promise.all([
        admin
          .from("merch_orders")
          .select(
            "id, athlete_id, amount_cents, currency, status, fulfillment_status, created_at, paid_at",
          )
          .order("created_at", { ascending: false })
          .limit(40),
        admin.from("merch_orders").select("*", { count: "exact", head: true }),
      ]);

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const rows = orders || [];
    const athleteIds = [...new Set(rows.map((row) => row.athlete_id))];

    const { data: profiles } =
      athleteIds.length > 0
        ? await admin
            .from("profiles")
            .select("id, full_name")
            .in("id", athleteIds)
        : { data: [] };

    const nameMap = new Map(
      (profiles || []).map((profile) => [profile.id, profile.full_name]),
    );

    const paidRevenue = rows
      .filter((row) => row.status === "paid")
      .reduce((sum, row) => sum + (row.amount_cents || 0), 0);

    const statusCounts = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    const fulfillmentCounts = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.fulfillment_status] = (acc[row.fulfillment_status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      totalOrders: totalOrders ?? rows.length,
      paidRevenueCents: paidRevenue,
      statusCounts,
      fulfillmentCounts,
      recentOrders: rows.map((row) => ({
        ...row,
        athlete_name: nameMap.get(row.athlete_id) ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Commerce laden mislukt.",
      },
      { status: 500 },
    );
  }
}
