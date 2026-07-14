import {
  COACHING_PLAN_IDS,
  listConfiguredCoachingPlans,
} from "@/lib/stripeSubscriptionConfig";
import { getApplicationFeePercent } from "@/lib/stripeConnect";
import {
  isLegacyCoachingBillingEnabled,
  isSubscriptionEnforcementEnabled,
} from "@/lib/subscriptionEnforcement";

export function getStripeCoachingHealthChecks() {
  const configuredPlans = listConfiguredCoachingPlans();

  return {
    stripeSecretPresent: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    coachingWebhookSecretPresent: Boolean(
      process.env.STRIPE_COACHING_WEBHOOK_SECRET?.trim() ||
        process.env.STRIPE_WEBHOOK_SECRET?.trim(),
    ),
    publishableKeyPresent: Boolean(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
    ),
    applicationFeePercent: getApplicationFeePercent(),
    marketplaceMode: "connect_direct_charges_v1_express",
    coachingPlansTotal: COACHING_PLAN_IDS.length,
    coachingPlansConfigured: configuredPlans.length,
    coachingPlansConfiguredList: configuredPlans,
    subscriptionGateEnabled: isSubscriptionEnforcementEnabled(),
    legacyBillingEnabled: isLegacyCoachingBillingEnabled(),
    billingDay: process.env.STRIPE_DEFAULT_BILLING_DAY ?? "20",
    billingCycleMode:
      process.env.STRIPE_BILLING_CYCLE_MODE ?? "trial_until_anchor",
  };
}
