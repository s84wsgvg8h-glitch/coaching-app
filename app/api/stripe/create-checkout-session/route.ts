import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import {
  coachingCheckoutSchema,
  parseJsonBody,
} from "@/lib/apiValidation";
import { getAppUrl } from "@/lib/appUrl";
import { resolveAthleteCheckoutPlanFromDb } from "@/lib/coachingCheckoutPlan";
import {
  buildCheckoutSubscriptionBillingData,
  buildSubscriptionBillingParams,
  resolveBillingDayForUser,
} from "@/lib/stripeBillingAnchor";
import {
  getOrCreateStripeCustomer,
  listActiveStripeSubscriptionsForCustomer,
} from "@/lib/stripeCustomer";
import {
  getApplicationFeePercent,
  resolveAthleteCoachConnect,
  resolveCoachStripePriceForPlanKey,
  stripeConnectOptions,
} from "@/lib/stripeConnect";
import { requireStripe } from "@/lib/stripe";
import { getCoachingPlanLabelForKey } from "@/lib/coachingPlanFromPrice";
import { userHasBlockingCoachingSubscription } from "@/lib/subscriptionStatus";
import { requireSupabaseServiceClient } from "@/lib/supabaseService";
import {
  prepareCoachConnectCheckoutPaymentMethods,
  resolveDefaultCoachPaymentMethodConfigurationId,
} from "@/lib/stripeConnectPaymentMethods";

/** Dynamic Payment Methods from Stripe Dashboard — never set payment_method_types. */
const COACHING_CHECKOUT_PAYMENT_SETTINGS = {
  payment_method_collection: "always" as const,
  locale: "nl" as const,
};

export async function POST(request: NextRequest) {
  const auth = await assertAuthenticatedActive(request);
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseJsonBody(request, coachingCheckoutSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const stripe = requireStripe();
  const service = requireSupabaseServiceClient();
  const { user, supabase } = auth;

  const checkoutPlan = await resolveAthleteCheckoutPlanFromDb(service, user.id);
  if (checkoutPlan.error || !checkoutPlan.planKey || !checkoutPlan.coachId) {
    return NextResponse.json(
      { error: checkoutPlan.error ?? "Abonnement kon niet worden bepaald." },
      { status: checkoutPlan.coachId ? 409 : 403 },
    );
  }

  const { planKey, coachId } = checkoutPlan;

  const coachConnect = await resolveAthleteCoachConnect(service, user.id);
  if (coachConnect.error || !coachConnect.context) {
    return NextResponse.json(
      { error: coachConnect.error ?? "Coach Stripe-account niet beschikbaar." },
      { status: 409 },
    );
  }

  const { connectAccountId } = coachConnect.context;

  if (coachConnect.context.coachId !== coachId) {
    return NextResponse.json(
      { error: "Coach-koppeling komt niet overeen met je profiel." },
      { status: 409 },
    );
  }

  let priceId: string;
  try {
    priceId = await resolveCoachStripePriceForPlanKey(
      service,
      coachId,
      connectAccountId,
      planKey,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Abonnement is nog niet geconfigureerd.",
      },
      { status: 503 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, betaling_dag")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "atleet") {
    return NextResponse.json(
      { error: "Alleen atleten kunnen een coachingabonnement afsluiten." },
      { status: 403 },
    );
  }

  const hasExisting = await userHasBlockingCoachingSubscription(service, user.id);
  if (hasExisting) {
    return NextResponse.json(
      { error: "Je hebt al een actief coachingabonnement." },
      { status: 409 },
    );
  }

  const { customerId } = await getOrCreateStripeCustomer({
    service,
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    stripeConnectAccountId: connectAccountId,
  });

  const stripeActive = await listActiveStripeSubscriptionsForCustomer(
    customerId,
    connectAccountId,
  );
  if (stripeActive.length > 0) {
    return NextResponse.json(
      { error: "Je hebt al een actief coachingabonnement in Stripe." },
      { status: 409 },
    );
  }

  const billingDay = resolveBillingDayForUser(
    profile?.betaling_dag !== null && profile?.betaling_dag !== undefined
      ? Number(profile.betaling_dag)
      : null,
  );
  const billingParams = buildSubscriptionBillingParams(billingDay);
  const applicationFeePercent = getApplicationFeePercent();

  const appUrl = getAppUrl();
  const subscriptionMetadata = {
    supabase_user_id: user.id,
    coach_id: coachId,
    stripe_connect_account_id: connectAccountId,
    plan_id: planKey,
    stripe_price_id: priceId,
    betaling_prijs: String(checkoutPlan.monthlyPrice),
  };

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: subscriptionMetadata,
    application_fee_percent: applicationFeePercent,
    ...buildCheckoutSubscriptionBillingData(billingParams),
  };

  const connectOptions = stripeConnectOptions(connectAccountId);

  const paymentMethodSetup = await prepareCoachConnectCheckoutPaymentMethods(
    connectAccountId,
  );
  if (paymentMethodSetup.errors.length > 0) {
    console.warn("[stripe/checkout] payment method configuration failed", {
      connectAccountId,
      errors: paymentMethodSetup.errors,
    });
  }

  const paymentMethodConfigurationId =
    paymentMethodSetup.configurationId ??
    (await resolveDefaultCoachPaymentMethodConfigurationId(stripe, connectAccountId));

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id: user.id,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/profile?section=subscription&checkout=success`,
        cancel_url: `${appUrl}/profile?section=subscription&checkout=cancel`,
        metadata: {
          ...subscriptionMetadata,
          plan_label: getCoachingPlanLabelForKey(planKey),
        },
        subscription_data: subscriptionData,
        allow_promotion_codes: false,
        ...(paymentMethodConfigurationId
          ? { payment_method_configuration: paymentMethodConfigurationId }
          : {}),
        ...COACHING_CHECKOUT_PAYMENT_SETTINGS,
      },
      connectOptions,
    );

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout kon niet worden gestart." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url, plan: planKey });
  } catch (error) {
    const stripeMessage =
      error instanceof Error ? error.message : "Checkout kon niet worden gestart.";
    console.error("[stripe/checkout] session create failed", {
      userId: user.id,
      coachId,
      connectAccountId,
      planKey,
      message: stripeMessage,
    });
    return NextResponse.json(
      {
        error:
          stripeMessage.includes("billing_cycle_anchor") &&
          stripeMessage.includes("trial_end")
            ? "Abonnement kon niet worden gestart door een Stripe-configuratiefout. Probeer het opnieuw."
            : stripeMessage,
      },
      { status: 500 },
    );
  }
}
