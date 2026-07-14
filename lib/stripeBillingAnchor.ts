import {
  clampBillingDay,
  COACHING_SUBSCRIPTION_BILLING,
  type BillingCycleMode,
} from "@/lib/stripeSubscriptionConfig";

export function resolveBillingDayForUser(profileBillingDay: number | null): number {
  if (
    profileBillingDay !== null &&
    profileBillingDay !== undefined &&
    Number.isFinite(Number(profileBillingDay))
  ) {
    return clampBillingDay(Number(profileBillingDay));
  }
  return COACHING_SUBSCRIPTION_BILLING.defaultBillingDay;
}

/** Next UTC noon on the given day-of-month (rolls to next month if already passed). */
export function computeNextBillingAnchorUnix(
  dayOfMonth: number,
  from: Date = new Date(),
): number {
  const day = clampBillingDay(dayOfMonth);
  const now = from.getTime();

  const tryMonth = (year: number, monthIndex: number) => {
    const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const effectiveDay = Math.min(day, lastDay);
    return Date.UTC(year, monthIndex, effectiveDay, 12, 0, 0, 0);
  };

  let year = from.getUTCFullYear();
  let month = from.getUTCMonth();
  let anchor = tryMonth(year, month);

  if (anchor <= now) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    anchor = tryMonth(year, month);
  }

  return Math.floor(anchor / 1000);
}

export type SubscriptionBillingParams = {
  billingCycleAnchor: number;
  trialEnd?: number;
  prorationBehavior?: "create_prorations" | "none";
};

export function buildSubscriptionBillingParams(
  billingDay: number,
  mode: BillingCycleMode = COACHING_SUBSCRIPTION_BILLING.mode,
): SubscriptionBillingParams {
  const anchor = computeNextBillingAnchorUnix(billingDay);

  if (mode === "trial_until_anchor") {
    return {
      billingCycleAnchor: anchor,
      trialEnd: anchor,
      prorationBehavior: "none",
    };
  }

  if (mode === "prorate") {
    return {
      billingCycleAnchor: anchor,
      prorationBehavior: "create_prorations",
    };
  }

  return {
    billingCycleAnchor: anchor,
    prorationBehavior: "none",
  };
}

/** Stripe Checkout rejects billing_cycle_anchor together with trial_end. */
export function buildCheckoutSubscriptionBillingData(
  billingParams: SubscriptionBillingParams,
): {
  billing_cycle_anchor?: number;
  trial_end?: number;
  proration_behavior?: "create_prorations" | "none";
} {
  if (billingParams.trialEnd) {
    return {
      trial_end: billingParams.trialEnd,
    };
  }

  return {
    billing_cycle_anchor: billingParams.billingCycleAnchor,
    proration_behavior: billingParams.prorationBehavior,
  };
}
