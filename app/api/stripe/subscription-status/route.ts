import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { getAthleteSubscriptionAccess } from "@/lib/coachingSubscriptionAccess";
import { shouldEnforceCoachingSubscription } from "@/lib/coachingAccess";
import {
  ensureAthleteCoachingSubscriptionSynced,
  subscriptionStatusLabel,
} from "@/lib/subscriptionStatus";
import {
  coachingPlanKeyForPaymentPrice,
  getCoachingPlanLabelForKey,
  normalizeCoachingMonthlyPrice,
} from "@/lib/coachingPlanFromPrice";
import { listConfiguredCoachingPlans } from "@/lib/stripeSubscriptionConfig";
import { requireSupabaseServiceClient } from "@/lib/supabaseService";

export async function GET(request: NextRequest) {
  const auth = await assertAuthenticatedActive(request);
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("role, betaling_prijs")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profile?.role !== "atleet") {
    return NextResponse.json({
      enforced: false,
      hasAccess: true,
      status: null,
      statusLabel: null,
      accessSource: null,
      legacyBilling: false,
      configuredPlans: listConfiguredCoachingPlans(),
      subscription: null,
      monthlyPrice: null,
      planLabel: null,
    });
  }

  const service = requireSupabaseServiceClient();
  const subscription = await ensureAthleteCoachingSubscriptionSynced(
    service,
    auth.user.id,
  );
  const access = await getAthleteSubscriptionAccess(auth.user.id);

  const monthlyPrice = normalizeCoachingMonthlyPrice(
    profile?.betaling_prijs !== null && profile?.betaling_prijs !== undefined
      ? Number(profile.betaling_prijs)
      : null,
  );
  const planKey =
    monthlyPrice !== null ? coachingPlanKeyForPaymentPrice(monthlyPrice) : null;
  const planLabel =
    planKey !== null ? getCoachingPlanLabelForKey(planKey) : null;

  return NextResponse.json({
    enforced: shouldEnforceCoachingSubscription(),
    hasAccess: access.hasAccess,
    accessSource: access.accessSource,
    legacyBilling: access.legacyBilling,
    status: subscription?.status ?? access.subscription?.status ?? null,
    statusLabel: subscription?.status
      ? subscriptionStatusLabel(subscription.status)
      : access.subscription?.status
        ? subscriptionStatusLabel(access.subscription.status)
        : null,
    currentPeriodEnd: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    requiresSubscription:
      shouldEnforceCoachingSubscription() && !access.hasAccess,
    configuredPlans: listConfiguredCoachingPlans(),
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    subscription,
    monthlyPrice,
    planLabel,
  });
}
