import type { CoachingPlanId } from "@/lib/stripeSubscriptionConfig";
import {
  getCoachingPlanAmountCents,
  isValidCoachingPlanId,
} from "@/lib/stripeSubscriptionConfig";

const PRICE_TO_PLAN: Record<number, CoachingPlanId> = {
  35: "coaching_35",
  55: "coaching_55",
  75: "coaching_75",
  100: "coaching_100",
  125: "coaching_125",
};

export const STANDARD_COACHING_PRICE_EUROS = Object.keys(PRICE_TO_PLAN).map(
  Number,
) as number[];

export function normalizeCoachingMonthlyPrice(
  price: number | null | undefined,
): number | null {
  if (price === null || price === undefined || !Number.isFinite(Number(price))) {
    return null;
  }

  const rounded = Math.round(Number(price));
  if (rounded <= 0) {
    return null;
  }

  return rounded;
}

export function coachingPlanFromPaymentPrice(
  price: number | null | undefined,
): CoachingPlanId | null {
  const amount = normalizeCoachingMonthlyPrice(price);
  if (amount === null) {
    return null;
  }

  return PRICE_TO_PLAN[amount] ?? null;
}

/** Stripe plan key: fixed tier (`coaching_75`) or custom amount (`amount_80`). */
export function coachingPlanKeyForPaymentPrice(
  price: number | null | undefined,
): string | null {
  const amount = normalizeCoachingMonthlyPrice(price);
  if (amount === null) {
    return null;
  }

  return PRICE_TO_PLAN[amount] ?? `amount_${amount}`;
}

export function getMonthlyEurosFromPlanKey(planKey: string): number | null {
  if (isValidCoachingPlanId(planKey)) {
    return getCoachingPlanAmountCents(planKey) / 100;
  }

  if (!planKey.startsWith("amount_")) {
    return null;
  }

  const amount = Number(planKey.slice("amount_".length));
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount);
}

export function getCoachingPlanLabelForKey(planKey: string): string {
  const euros = getMonthlyEurosFromPlanKey(planKey);
  if (euros === null) {
    return "Coaching abonnement";
  }

  return `Coaching abonnement €${euros}`;
}
