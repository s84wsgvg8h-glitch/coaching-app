import type { SupabaseClient } from "@supabase/supabase-js";
import {
  coachingPlanKeyForPaymentPrice,
  normalizeCoachingMonthlyPrice,
} from "@/lib/coachingPlanFromPrice";

export type AthleteCheckoutPlanResult =
  | {
      error: null;
      planKey: string;
      coachId: string;
      monthlyPrice: number;
    }
  | {
      error: string;
      planKey: null;
      coachId: null;
      monthlyPrice: null;
    };

export function resolveCoachingPlanForAthleteProfile(profile: {
  role: string | null;
  coach_id: string | null;
  betaling_prijs: number | null;
}): AthleteCheckoutPlanResult {
  if (profile.role !== "atleet") {
    return {
      error: "Alleen atleten kunnen een coachingabonnement afsluiten.",
      planKey: null,
      coachId: null,
      monthlyPrice: null,
    };
  }

  const coachId = profile.coach_id?.trim() || null;
  if (!coachId) {
    return {
      error:
        "Je hebt nog geen coach gekoppeld. Vraag je coach om je uit te nodigen.",
      planKey: null,
      coachId: null,
      monthlyPrice: null,
    };
  }

  const monthlyPrice = normalizeCoachingMonthlyPrice(profile.betaling_prijs);
  const planKey = coachingPlanKeyForPaymentPrice(profile.betaling_prijs);

  if (!planKey || monthlyPrice === null) {
    return {
      error:
        "Je coach moet eerst je abonnementsprijs instellen voordat je kunt afsluiten.",
      planKey: null,
      coachId: null,
      monthlyPrice: null,
    };
  }

  return {
    error: null,
    planKey,
    coachId,
    monthlyPrice,
  };
}

export async function resolveAthleteCheckoutPlanFromDb(
  service: SupabaseClient,
  athleteUserId: string,
): Promise<AthleteCheckoutPlanResult> {
  const { data: profile, error } = await service
    .from("profiles")
    .select("role, coach_id, betaling_prijs")
    .eq("id", athleteUserId)
    .maybeSingle();

  if (error || !profile) {
    return {
      error: "Profiel kon niet worden geladen.",
      planKey: null,
      coachId: null,
      monthlyPrice: null,
    };
  }

  return resolveCoachingPlanForAthleteProfile({
    role: (profile.role as string | null) ?? null,
    coach_id: (profile.coach_id as string | null) ?? null,
    betaling_prijs:
      profile.betaling_prijs !== null && profile.betaling_prijs !== undefined
        ? Number(profile.betaling_prijs)
        : null,
  });
}
