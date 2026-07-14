"use client";

import { useQuery } from "@tanstack/react-query";
import { getRealSupabase } from "@/lib/supabaseClient";
import type { CoachingSubscriptionRow } from "@/lib/subscriptionStatus";

export function useCoachingSubscription(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["coaching-subscription", userId],
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: async (): Promise<CoachingSubscriptionRow | null> => {
      if (!userId) return null;

      const { data, error } = await getRealSupabase()
        .from("coaching_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error("Abonnement kon niet worden geladen.");
      }

      return (data as CoachingSubscriptionRow | null) ?? null;
    },
  });
}
