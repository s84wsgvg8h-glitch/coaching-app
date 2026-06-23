import { supabase } from "@/lib/supabaseClient";
import { applyAthleteScope, loadCoachOrgContext } from "@/lib/orgAthleteScope";
import { formatPaymentPrice } from "@/lib/athletePayments";

export type CoachPaymentOverviewRow = {
  athleteId: string;
  athleteName: string;
  monthlyPrice: number | null;
  paymentDay: number | null;
  nextPaymentDate: string | null;
};

export type CoachPaymentOverview = {
  rows: CoachPaymentOverviewRow[];
  totalMonthlyIncome: number;
  payingAthleteCount: number;
  stripeConnectAccountId: string | null;
  stripeConnectOnboardedAt: string | null;
};

function getNextPaymentDateIso(paymentDay: number) {
  const today = new Date();
  const candidate = new Date(
    today.getFullYear(),
    today.getMonth(),
    paymentDay,
    12,
    0,
    0,
    0,
  );

  if (candidate < today) {
    candidate.setMonth(candidate.getMonth() + 1);
  }

  return candidate.toISOString().slice(0, 10);
}

export async function loadCoachPaymentOverview(
  coachId: string,
  role: string,
): Promise<CoachPaymentOverview> {
  const ctx = (await loadCoachOrgContext(coachId)) || {
    coachId,
    role,
    organizationId: null,
  };
  ctx.role = role;

  let athletesQuery = supabase
    .from("profiles")
    .select("id, full_name, betaling_prijs, betaling_dag")
    .eq("role", "atleet")
    .order("full_name", { ascending: true });

  athletesQuery = applyAthleteScope(athletesQuery, ctx);

  const [{ data: athletes }, { data: coachProfile }] = await Promise.all([
    athletesQuery,
    supabase
      .from("profiles")
      .select("stripe_connect_account_id, stripe_connect_onboarded_at")
      .eq("id", coachId)
      .maybeSingle(),
  ]);

  const rows: CoachPaymentOverviewRow[] = (athletes || []).map((athlete) => {
    const paymentDay =
      athlete.betaling_dag !== null && athlete.betaling_dag !== undefined
        ? Number(athlete.betaling_dag)
        : null;
    const monthlyPrice =
      athlete.betaling_prijs !== null && athlete.betaling_prijs !== undefined
        ? Number(athlete.betaling_prijs)
        : null;

    return {
      athleteId: athlete.id as string,
      athleteName: (athlete.full_name as string) || "Atleet",
      monthlyPrice,
      paymentDay,
      nextPaymentDate:
        paymentDay !== null && !Number.isNaN(paymentDay)
          ? getNextPaymentDateIso(paymentDay)
          : null,
    };
  });

  const payingRows = rows.filter(
    (row) => row.monthlyPrice !== null && !Number.isNaN(row.monthlyPrice),
  );

  return {
    rows,
    totalMonthlyIncome: payingRows.reduce(
      (sum, row) => sum + (row.monthlyPrice || 0),
      0,
    ),
    payingAthleteCount: payingRows.length,
    stripeConnectAccountId:
      (coachProfile?.stripe_connect_account_id as string | null) || null,
    stripeConnectOnboardedAt:
      (coachProfile?.stripe_connect_onboarded_at as string | null) || null,
  };
}

export { formatPaymentPrice };
