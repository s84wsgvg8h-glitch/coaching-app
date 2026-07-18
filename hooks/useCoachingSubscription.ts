"use client";

import { useQuery } from "@tanstack/react-query";
import { getRealSupabase } from "@/lib/supabaseClient";
import type { CoachingSubscriptionRow } from "@/lib/subscriptionStatus";

export type CoachingSubscriptionQueryResult = {
  subscription: CoachingSubscriptionRow | null;
  monthlyPrice: number | null;
  planLabel: string | null;
};

export function useCoachingSubscription(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["coaching-subscription", userId],
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: async (): Promise<CoachingSubscriptionQueryResult> => {
      if (!userId) {
        return { subscription: null, monthlyPrice: null, planLabel: null };
      }

      const { data: sessionData } = await getRealSupabase().auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error("Je bent niet ingelogd.");
      }

      const response = await fetch("/api/stripe/subscription-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        subscription?: CoachingSubscriptionRow | null;
        monthlyPrice?: number | null;
        planLabel?: string | null;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Abonnement kon niet worden geladen.");
      }

      return {
        subscription: payload?.subscription ?? null,
        monthlyPrice: payload?.monthlyPrice ?? null,
        planLabel: payload?.planLabel ?? null,
      };
    },
  });
}
