export type BillingCycleMode = "prorate" | "no_prorate" | "trial_until_anchor";

export const COACHING_PLAN_IDS = [
  "coaching_35",
  "coaching_55",
  "coaching_75",
  "coaching_100",
  "coaching_125",
] as const;

export type CoachingPlanId = (typeof COACHING_PLAN_IDS)[number];

export const COACHING_SUBSCRIPTION_PLANS: Record<
  CoachingPlanId,
  { label: string; priceEnvVar: string; amountCents: number }
> = {
  coaching_35: {
    label: "Coaching abonnement €35",
    priceEnvVar: "STRIPE_PRICE_ID_COACHING_35",
    amountCents: 3500,
  },
  coaching_55: {
    label: "Coaching abonnement €55",
    priceEnvVar: "STRIPE_PRICE_ID_COACHING_55",
    amountCents: 5500,
  },
  coaching_75: {
    label: "Coaching abonnement €75",
    priceEnvVar: "STRIPE_PRICE_ID_COACHING_75",
    amountCents: 7500,
  },
  coaching_100: {
    label: "Coaching abonnement €100",
    priceEnvVar: "STRIPE_PRICE_ID_COACHING_100",
    amountCents: 10000,
  },
  coaching_125: {
    label: "Coaching abonnement €125",
    priceEnvVar: "STRIPE_PRICE_ID_COACHING_125",
    amountCents: 12500,
  },
};

export const COACHING_SUBSCRIPTION_BILLING = {
  defaultBillingDay: clampBillingDay(
    Number(process.env.STRIPE_DEFAULT_BILLING_DAY || 20),
  ),
  mode: (process.env.STRIPE_BILLING_CYCLE_MODE ||
    "trial_until_anchor") as BillingCycleMode,
  plans: COACHING_SUBSCRIPTION_PLANS,
} as const;

export function clampBillingDay(day: number): number {
  if (!Number.isFinite(day)) return 20;
  return Math.min(31, Math.max(1, Math.round(day)));
}

export function isValidCoachingPlanId(value: string): value is CoachingPlanId {
  return (COACHING_PLAN_IDS as readonly string[]).includes(value);
}

/** Server-side allowlist — maps plan key to Stripe Price ID from env. */
export function resolveCoachingPriceId(planId: CoachingPlanId): string | null {
  const plan = COACHING_SUBSCRIPTION_PLANS[planId];
  if (!plan) return null;
  const priceId = process.env[plan.priceEnvVar]?.trim();
  return priceId || null;
}

export function getCoachingPlanPriceEnvVar(planId: CoachingPlanId): string {
  return COACHING_SUBSCRIPTION_PLANS[planId].priceEnvVar;
}

/** Server-side allowlist — never trust client-supplied price IDs. */
export function assertAllowedCoachingPriceId(
  priceId: string,
  planId: CoachingPlanId,
): void {
  const allowed = resolveCoachingPriceId(planId);
  if (!allowed || priceId !== allowed) {
    throw new Error("Ongeldig abonnement.");
  }
}

export function getCoachingPlanLabel(planId: CoachingPlanId): string {
  return COACHING_SUBSCRIPTION_PLANS[planId]?.label ?? "Coaching";
}

export function getCoachingPlanAmountCents(planId: CoachingPlanId): number {
  return COACHING_SUBSCRIPTION_PLANS[planId]?.amountCents ?? 0;
}

/** Marketplace tiers are fixed; platform price env vars are legacy/reference only. */
export function listConfiguredCoachingPlans(): CoachingPlanId[] {
  return [...COACHING_PLAN_IDS];
}
