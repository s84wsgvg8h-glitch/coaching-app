import type { SupabaseClient } from "@supabase/supabase-js";
import { coachingPlanFromPaymentPrice } from "@/lib/coachingPlanFromPrice";
import {
  getSubscriptionStatus,
  hasActiveSubscription,
  isSubscriptionAccessStatus,
  type CoachingSubscriptionRow,
} from "@/lib/subscriptionStatus";
import {
  isLegacyCoachingBillingEnabled,
  isSubscriptionEnforcementEnabled,
} from "@/lib/subscriptionEnforcement";

export function hasLegacyCoachingBilling(
  betalingPrijs: number | null | undefined,
): boolean {
  if (!isLegacyCoachingBillingEnabled()) return false;
  return coachingPlanFromPaymentPrice(betalingPrijs) !== null;
}

export async function hasCoachingAccess(
  service: SupabaseClient,
  userId: string,
): Promise<boolean> {
  if (await hasActiveSubscription(service, userId)) {
    return true;
  }

  const { data: profile } = await service
    .from("profiles")
    .select("betaling_prijs")
    .eq("id", userId)
    .maybeSingle();

  return hasLegacyCoachingBilling(
    profile?.betaling_prijs !== null && profile?.betaling_prijs !== undefined
      ? Number(profile.betaling_prijs)
      : null,
  );
}

export async function getCoachingAccessDetails(
  service: SupabaseClient,
  userId: string,
): Promise<{
  hasAccess: boolean;
  accessSource: "stripe" | "legacy" | "none";
  subscription: CoachingSubscriptionRow | null;
  legacyBilling: boolean;
}> {
  const subscription = await getSubscriptionStatus(service, userId);
  const stripeAccess = subscription
    ? isSubscriptionAccessStatus(subscription.status)
    : false;

  if (stripeAccess) {
    return {
      hasAccess: true,
      accessSource: "stripe",
      subscription,
      legacyBilling: false,
    };
  }

  const { data: profile } = await service
    .from("profiles")
    .select("betaling_prijs")
    .eq("id", userId)
    .maybeSingle();

  const legacyBilling = hasLegacyCoachingBilling(
    profile?.betaling_prijs !== null && profile?.betaling_prijs !== undefined
      ? Number(profile.betaling_prijs)
      : null,
  );

  return {
    hasAccess: legacyBilling,
    accessSource: legacyBilling ? "legacy" : "none",
    subscription,
    legacyBilling,
  };
}

export function shouldEnforceCoachingSubscription(): boolean {
  return isSubscriptionEnforcementEnabled();
}
