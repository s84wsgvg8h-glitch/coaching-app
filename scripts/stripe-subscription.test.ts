import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildCoachConnectPaymentMethodUpdatePayload,
  COACH_CONNECT_ACCOUNT_CAPABILITIES,
  COACH_CONNECT_PAYMENT_METHODS_DISABLE,
  COACH_CONNECT_PAYMENT_METHODS_ENABLE,
  COACH_CONNECT_PAYMENT_METHODS_OPTIONAL_ENABLE,
} from "../lib/stripeConnectPaymentMethods";
import {
  resolveCoachingPlanForAthleteProfile,
} from "../lib/coachingCheckoutPlan";
import {
  COACHING_PLAN_IDS,
  assertAllowedCoachingPriceId,
  getCoachingPlanAmountCents,
  getCoachingPlanPriceEnvVar,
  isValidCoachingPlanId,
  listConfiguredCoachingPlans,
  resolveCoachingPriceId,
} from "../lib/stripeSubscriptionConfig";
import { buildCheckoutSubscriptionBillingData, buildSubscriptionBillingParams } from "../lib/stripeBillingAnchor";
import { getApplicationFeePercent } from "../lib/stripeConnect";
import {
  isSubscriptionAccessStatus,
  pickPrimaryCoachingStripeSubscription,
} from "../lib/subscriptionStatus";
import { isSubscriptionEnforcementEnabled } from "../lib/subscriptionEnforcement";
import { hasLegacyCoachingBilling } from "../lib/coachingAccess";
import { coachingPlanFromPaymentPrice, coachingPlanKeyForPaymentPrice } from "../lib/coachingPlanFromPrice";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`fail - ${name}`);
    throw error;
  }
}

test("pickPrimaryCoachingStripeSubscription prefers trialing over active", () => {
  const picked = pickPrimaryCoachingStripeSubscription([
    { status: "active", id: "sub_active" },
    { status: "trialing", id: "sub_trial" },
  ] as Array<{ status: string; id: string }>);
  assert.equal(picked?.id, "sub_trial");
});

test("isSubscriptionAccessStatus treats active and trialing as access", () => {
  assert.equal(isSubscriptionAccessStatus("active"), true);
  assert.equal(isSubscriptionAccessStatus("trialing"), true);
  assert.equal(isSubscriptionAccessStatus("past_due"), false);
  assert.equal(isSubscriptionAccessStatus("canceled"), false);
});

test("all coaching plan keys map to dedicated env vars", () => {
  for (const planId of COACHING_PLAN_IDS) {
    assert.ok(isValidCoachingPlanId(planId));
    assert.match(getCoachingPlanPriceEnvVar(planId), /^STRIPE_PRICE_ID_COACHING_/);
  }
});

test("listConfiguredCoachingPlans returns all fixed marketplace tiers", () => {
  assert.deepEqual(listConfiguredCoachingPlans(), [...COACHING_PLAN_IDS]);
});

test("coaching plan amounts match euro tiers", () => {
  assert.equal(getCoachingPlanAmountCents("coaching_35"), 3500);
  assert.equal(getCoachingPlanAmountCents("coaching_125"), 12500);
});

test("buildCheckoutSubscriptionBillingData never sends anchor and trial together", () => {
  const trialParams = buildSubscriptionBillingParams(20, "trial_until_anchor");
  const trialCheckout = buildCheckoutSubscriptionBillingData(trialParams);
  assert.ok(trialCheckout.trial_end);
  assert.equal(trialCheckout.billing_cycle_anchor, undefined);
  assert.equal(trialCheckout.proration_behavior, undefined);

  const prorateParams = buildSubscriptionBillingParams(20, "prorate");
  const prorateCheckout = buildCheckoutSubscriptionBillingData(prorateParams);
  assert.ok(prorateCheckout.billing_cycle_anchor);
  assert.equal(prorateCheckout.trial_end, undefined);
});

test("coaching checkout keeps dynamic payment methods", () => {
  const checkoutSource = readFileSync(
    new URL("../app/api/stripe/create-checkout-session/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(checkoutSource, /payment_method_types\s*:/);
  assert.match(checkoutSource, /payment_method_collection:\s*"always"/);
  assert.match(checkoutSource, /payment_method_configuration/);
  assert.match(checkoutSource, /locale:\s*"nl"/);
});

test("coach connect payment method config enables EU methods and disables klarna", () => {
  assert.deepEqual(COACH_CONNECT_PAYMENT_METHODS_ENABLE, [
    "ideal",
    "bancontact",
    "sepa_debit",
  ]);
  assert.deepEqual(COACH_CONNECT_PAYMENT_METHODS_DISABLE, ["klarna"]);
  assert.deepEqual(COACH_CONNECT_PAYMENT_METHODS_OPTIONAL_ENABLE, ["paypal"]);

  const payload = buildCoachConnectPaymentMethodUpdatePayload({
    id: "pmc_test",
    object: "payment_method_configuration",
    ideal: {
      available: true,
      display_preference: { value: "off", preference: "off" },
    },
    bancontact: {
      available: true,
      display_preference: { value: "on", preference: "on" },
    },
    sepa_debit: {
      available: true,
      display_preference: { value: "off", preference: "off" },
    },
    klarna: {
      available: true,
      display_preference: { value: "on", preference: "on" },
    },
    paypal: {
      available: false,
      display_preference: { value: "off", preference: "off" },
    },
  } as never);

  assert.deepEqual(payload.ideal, {
    display_preference: { preference: "on" },
  });
  assert.equal(payload.bancontact, undefined);
  assert.deepEqual(payload.sepa_debit, {
    display_preference: { preference: "on" },
  });
  assert.deepEqual(payload.klarna, {
    display_preference: { preference: "off" },
  });
  assert.equal(payload.paypal, undefined);
});

test("coach connect requests EU payment capabilities", () => {
  assert.equal(COACH_CONNECT_ACCOUNT_CAPABILITIES.card_payments?.requested, true);
  assert.equal(COACH_CONNECT_ACCOUNT_CAPABILITIES.sepa_debit_payments?.requested, true);
  assert.equal(COACH_CONNECT_ACCOUNT_CAPABILITIES.ideal_payments?.requested, true);
  assert.equal(COACH_CONNECT_ACCOUNT_CAPABILITIES.bancontact_payments?.requested, true);
});

test("coaching webhook handles async checkout payments", () => {
  const webhookSource = readFileSync(
    new URL("../app/api/stripe/webhook/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(webhookSource, /checkout\.session\.async_payment_succeeded/);
  assert.match(webhookSource, /checkout\.session\.async_payment_failed/);
  assert.match(webhookSource, /payment_status === "unpaid"/);
});

test("application fee percent defaults safely", () => {
  const previous = process.env.STRIPE_APPLICATION_FEE_PERCENT;
  delete process.env.STRIPE_APPLICATION_FEE_PERCENT;
  assert.equal(getApplicationFeePercent(), 0);
  process.env.STRIPE_APPLICATION_FEE_PERCENT = "15";
  assert.equal(getApplicationFeePercent(), 15);
  if (previous === undefined) delete process.env.STRIPE_APPLICATION_FEE_PERCENT;
  else process.env.STRIPE_APPLICATION_FEE_PERCENT = previous;
});

test("resolveCoachingPlanForAthleteProfile uses server-side betaling_prijs only", () => {
  const resolved = resolveCoachingPlanForAthleteProfile({
    role: "atleet",
    coach_id: "coach-uuid",
    betaling_prijs: 75,
  });
  assert.equal(resolved.error, null);
  assert.equal(resolved.planKey, "coaching_75");
  assert.equal(resolved.coachId, "coach-uuid");
  assert.equal(resolved.monthlyPrice, 75);

  const spoofedCheapPlan = resolveCoachingPlanForAthleteProfile({
    role: "atleet",
    coach_id: "coach-uuid",
    betaling_prijs: 125,
  });
  assert.equal(spoofedCheapPlan.planKey, "coaching_125");
  assert.notEqual(spoofedCheapPlan.planKey, "coaching_35");

  const missingCoach = resolveCoachingPlanForAthleteProfile({
    role: "atleet",
    coach_id: null,
    betaling_prijs: 35,
  });
  assert.ok(missingCoach.error);

  const customPrice = resolveCoachingPlanForAthleteProfile({
    role: "atleet",
    coach_id: "coach-uuid",
    betaling_prijs: 99,
  });
  assert.equal(customPrice.error, null);
  assert.equal(customPrice.planKey, "amount_99");
  assert.equal(customPrice.monthlyPrice, 99);

  const missingPrice = resolveCoachingPlanForAthleteProfile({
    role: "atleet",
    coach_id: "coach-uuid",
    betaling_prijs: null,
  });
  assert.ok(missingPrice.error);
});

test("resolveCoachingPriceId uses allowlisted env var only", () => {
  const previous: Record<string, string | undefined> = {};
  for (const planId of COACHING_PLAN_IDS) {
    const envVar = getCoachingPlanPriceEnvVar(planId);
    previous[envVar] = process.env[envVar];
    process.env[envVar] = `price_test_${planId}`;
    assert.equal(resolveCoachingPriceId(planId), `price_test_${planId}`);
  }
  for (const [envVar, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[envVar];
    else process.env[envVar] = value;
  }
});

test("coachingPlanFromPaymentPrice maps coach price to plan key", () => {
  assert.equal(coachingPlanFromPaymentPrice(35), "coaching_35");
  assert.equal(coachingPlanFromPaymentPrice(125), "coaching_125");
  assert.equal(coachingPlanFromPaymentPrice(99), null);
  assert.equal(coachingPlanKeyForPaymentPrice(99), "amount_99");
  assert.equal(coachingPlanKeyForPaymentPrice(129), "amount_129");
});

test("assertAllowedCoachingPriceId rejects client price ids", () => {
  const envVar = getCoachingPlanPriceEnvVar("coaching_75");
  const previous = process.env[envVar];
  process.env[envVar] = "price_server_only";
  assert.throws(
    () => assertAllowedCoachingPriceId("price_from_client", "coaching_75"),
    /Ongeldig abonnement/,
  );
  assert.doesNotThrow(() =>
    assertAllowedCoachingPriceId("price_server_only", "coaching_75"),
  );
  if (previous === undefined) delete process.env[envVar];
  else process.env[envVar] = previous;
});

test("legacy coaching billing accepts configured coach prices", () => {
  const previous = process.env.NEXT_PUBLIC_STRIPE_LEGACY_BILLING_ACCESS;
  process.env.NEXT_PUBLIC_STRIPE_LEGACY_BILLING_ACCESS = "true";
  assert.equal(hasLegacyCoachingBilling(75), true);
  assert.equal(hasLegacyCoachingBilling(99), false);
  process.env.NEXT_PUBLIC_STRIPE_LEGACY_BILLING_ACCESS = previous;
});

test("subscription enforcement respects feature flag", () => {
  const previous = process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_REQUIRED;
  process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_REQUIRED = "false";
  assert.equal(isSubscriptionEnforcementEnabled(), false);
  process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_REQUIRED = "true";
  assert.equal(isSubscriptionEnforcementEnabled(), true);
  process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_REQUIRED = previous;
});

console.log("stripe-subscription tests passed");
