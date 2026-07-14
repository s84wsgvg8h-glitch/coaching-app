"use client";

import { useQuery } from "@tanstack/react-query";
import { getRealSupabase } from "@/lib/supabaseClient";
import { coachingPlanFromPaymentPrice } from "@/lib/coachingPlanFromPrice";
import {
  isLegacyCoachingBillingEnabled,
  isSubscriptionEnforcementEnabled,
} from "@/lib/subscriptionEnforcement";
import {
  isSubscriptionAccessStatus,
  type CoachingSubscriptionRow,
} from "@/lib/subscriptionStatus";

export function useAthleteSubscriptionAccess(
  userId: string | null | undefined,
  role: string | null | undefined,
) {
  const enforcementEnabled = isSubscriptionEnforcementEnabled();
  const legacyEnabled = isLegacyCoachingBillingEnabled();
  const shouldCheck =
    enforcementEnabled && Boolean(userId) && role === "atleet";

  return useQuery({
    queryKey: [
      "athlete-subscription-access",
      userId,
      enforcementEnabled,
      legacyEnabled,
    ],
    enabled: shouldCheck,
    staleTime: 30_000,
    queryFn: async (): Promise<{
      hasAccess: boolean;
      subscription: CoachingSubscriptionRow | null;
      legacyBilling: boolean;
    }> => {
      if (!userId) {
        return { hasAccess: false, subscription: null, legacyBilling: false };
      }

      const client = getRealSupabase();
      const [subscriptionResult, profileResult] = await Promise.all([
        client
          .from("coaching_subscriptions")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(5),
        client
          .from("profiles")
          .select("betaling_prijs")
          .eq("id", userId)
          .maybeSingle(),
      ]);

      if (subscriptionResult.error) {
        throw new Error("Abonnementsstatus kon niet worden geladen.");
      }

      const rows = (subscriptionResult.data ?? []) as CoachingSubscriptionRow[];
      const accessRow =
        rows.find((row) => isSubscriptionAccessStatus(row.status)) ?? null;

      const legacyBilling =
        legacyEnabled &&
        coachingPlanFromPaymentPrice(
          profileResult.data?.betaling_prijs !== null &&
            profileResult.data?.betaling_prijs !== undefined
            ? Number(profileResult.data.betaling_prijs)
            : null,
        ) !== null;

      return {
        hasAccess: Boolean(accessRow) || legacyBilling,
        subscription: accessRow ?? rows[0] ?? null,
        legacyBilling,
      };
    },
  });
}
