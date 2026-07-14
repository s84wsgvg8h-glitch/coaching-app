import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { requireStripe } from "@/lib/stripe";
import {
  COACHING_PLAN_IDS,
  getCoachingPlanAmountCents,
  getCoachingPlanLabel,
  type CoachingPlanId,
  isValidCoachingPlanId,
} from "@/lib/stripeSubscriptionConfig";
import {
  getCoachingPlanLabelForKey,
  getMonthlyEurosFromPlanKey,
} from "@/lib/coachingPlanFromPrice";
import { ensureCoachConnectPaymentSetup } from "@/lib/stripeConnectPaymentMethods";

export type StripeConnectRequestOptions = Stripe.RequestOptions;

export function stripeConnectOptions(
  connectAccountId: string,
): StripeConnectRequestOptions {
  return { stripeAccount: connectAccountId };
}

export type CoachConnectStatus = {
  accountId: string;
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  pendingOnboarding: boolean;
  requirementsDue: string[];
  requirementsEventuallyDue: string[];
  requirementsPastDue: string[];
  disabledReason: string | null;
};

export type AthleteCoachConnectContext = {
  coachId: string;
  connectAccountId: string;
  status: CoachConnectStatus;
};

export function getApplicationFeePercent(): number {
  const raw = Number(process.env.STRIPE_APPLICATION_FEE_PERCENT ?? 10);
  if (!Number.isFinite(raw)) return 10;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function mapConnectAccountStatus(
  account: Stripe.Account,
): CoachConnectStatus {
  const requirements = account.requirements;
  return {
    accountId: account.id,
    connected: Boolean(account.charges_enabled && account.payouts_enabled),
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    pendingOnboarding: !account.charges_enabled || !account.payouts_enabled,
    requirementsDue: requirements?.currently_due ?? [],
    requirementsEventuallyDue: requirements?.eventually_due ?? [],
    requirementsPastDue: requirements?.past_due ?? [],
    disabledReason: requirements?.disabled_reason ?? null,
  };
}

export async function retrieveConnectAccount(
  connectAccountId: string,
): Promise<CoachConnectStatus> {
  const stripe = requireStripe();
  const account = await stripe.accounts.retrieve(connectAccountId);
  return mapConnectAccountStatus(account);
}

export async function resolveAthleteCoachConnect(
  service: SupabaseClient,
  athleteUserId: string,
): Promise<
  | { error: null; context: AthleteCoachConnectContext }
  | { error: string; context: null }
> {
  const { data: athleteProfile } = await service
    .from("profiles")
    .select("coach_id")
    .eq("id", athleteUserId)
    .maybeSingle();

  const coachId = athleteProfile?.coach_id as string | null;
  if (!coachId) {
    return {
      error: "Je hebt nog geen coach gekoppeld. Vraag je coach om je uit te nodigen.",
      context: null,
    };
  }

  const { data: coachProfile } = await service
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", coachId)
    .maybeSingle();

  const connectAccountId =
    (coachProfile?.stripe_connect_account_id as string | null)?.trim() || null;

  if (!connectAccountId) {
    return {
      error:
        "Je coach heeft Stripe nog niet gekoppeld. Vraag je coach om betalingen in te stellen via Betalingen.",
      context: null,
    };
  }

  try {
    const status = await retrieveConnectAccount(connectAccountId);
    if (!status.chargesEnabled) {
      return {
        error:
          "Je coach moet Stripe onboarding afronden voordat je een abonnement kunt afsluiten.",
        context: null,
      };
    }

    return {
      error: null,
      context: {
        coachId,
        connectAccountId,
        status,
      },
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Stripe-status van je coach kon niet worden opgehaald.",
      context: null,
    };
  }
}

export async function ensureCoachStripePrices(
  service: SupabaseClient,
  coachId: string,
  connectAccountId: string,
): Promise<void> {
  const stripe = requireStripe();
  const requestOptions = stripeConnectOptions(connectAccountId);

  for (const planId of COACHING_PLAN_IDS) {
    const { data: existing } = await service
      .from("coach_stripe_prices")
      .select("stripe_price_id, stripe_connect_account_id")
      .eq("coach_id", coachId)
      .eq("plan_id", planId)
      .maybeSingle();

    if (
      existing?.stripe_price_id &&
      existing.stripe_connect_account_id === connectAccountId
    ) {
      continue;
    }

    const product = await stripe.products.create(
      {
        name: getCoachingPlanLabel(planId),
        metadata: {
          coach_id: coachId,
          plan_id: planId,
          platform: "limitless_coaching",
        },
      },
      requestOptions,
    );

    const price = await stripe.prices.create(
      {
        product: product.id,
        currency: "eur",
        unit_amount: getCoachingPlanAmountCents(planId),
        recurring: { interval: "month" },
        metadata: {
          coach_id: coachId,
          plan_id: planId,
          platform: "limitless_coaching",
        },
      },
      requestOptions,
    );

    await service.from("coach_stripe_prices").upsert(
      {
        coach_id: coachId,
        plan_id: planId,
        stripe_connect_account_id: connectAccountId,
        stripe_price_id: price.id,
      },
      { onConflict: "coach_id,plan_id" },
    );
  }
}

export async function resolveCoachStripePriceForPlanKey(
  service: SupabaseClient,
  coachId: string,
  connectAccountId: string,
  planKey: string,
): Promise<string> {
  const amountEuros = getMonthlyEurosFromPlanKey(planKey);
  if (!amountEuros) {
    throw new Error("Ongeldig abonnement.");
  }

  if (isValidCoachingPlanId(planKey)) {
    return resolveCoachStripePriceId(
      service,
      coachId,
      connectAccountId,
      planKey,
    );
  }

  const stripe = requireStripe();
  const requestOptions = stripeConnectOptions(connectAccountId);

  const { data: existing } = await service
    .from("coach_stripe_prices")
    .select("stripe_price_id, stripe_connect_account_id")
    .eq("coach_id", coachId)
    .eq("plan_id", planKey)
    .maybeSingle();

  if (
    existing?.stripe_price_id &&
    existing.stripe_connect_account_id === connectAccountId
  ) {
    return existing.stripe_price_id as string;
  }

  const product = await stripe.products.create(
    {
      name: getCoachingPlanLabelForKey(planKey),
      metadata: {
        coach_id: coachId,
        plan_id: planKey,
        monthly_price_eur: String(amountEuros),
        platform: "limitless_coaching",
      },
    },
    requestOptions,
  );

  const price = await stripe.prices.create(
    {
      product: product.id,
      currency: "eur",
      unit_amount: amountEuros * 100,
      recurring: { interval: "month" },
      metadata: {
        coach_id: coachId,
        plan_id: planKey,
        monthly_price_eur: String(amountEuros),
        platform: "limitless_coaching",
      },
    },
    requestOptions,
  );

  await service.from("coach_stripe_prices").upsert(
    {
      coach_id: coachId,
      plan_id: planKey,
      stripe_connect_account_id: connectAccountId,
      stripe_price_id: price.id,
    },
    { onConflict: "coach_id,plan_id" },
  );

  return price.id;
}

export async function resolveCoachStripePriceId(
  service: SupabaseClient,
  coachId: string,
  connectAccountId: string,
  planId: CoachingPlanId,
): Promise<string> {
  if (!isValidCoachingPlanId(planId)) {
    throw new Error("Ongeldig abonnement.");
  }

  await ensureCoachStripePrices(service, coachId, connectAccountId);

  const { data, error } = await service
    .from("coach_stripe_prices")
    .select("stripe_price_id, stripe_connect_account_id")
    .eq("coach_id", coachId)
    .eq("plan_id", planId)
    .maybeSingle();

  if (error || !data?.stripe_price_id) {
    throw new Error("Abonnementsprijs kon niet worden opgehaald.");
  }

  if (data.stripe_connect_account_id !== connectAccountId) {
    throw new Error("Stripe-prijzen komen niet overeen met het coach-account.");
  }

  return data.stripe_price_id as string;
}

export async function syncCoachConnectProfile(
  service: SupabaseClient,
  coachId: string,
  account: Stripe.Account,
): Promise<CoachConnectStatus> {
  const status = mapConnectAccountStatus(account);
  const update: Record<string, string | null> = {};

  if (status.connected) {
    update.stripe_connect_onboarded_at = new Date().toISOString();
  }

  if (Object.keys(update).length > 0) {
    await service.from("profiles").update(update).eq("id", coachId);
  }

  if (status.chargesEnabled) {
    await ensureCoachStripePrices(service, coachId, status.accountId);
    try {
      await ensureCoachConnectPaymentSetup(status.accountId);
    } catch (paymentMethodError) {
      console.warn("[stripe/connect] payment method setup during sync failed", {
        accountId: status.accountId,
        coachId,
        message:
          paymentMethodError instanceof Error
            ? paymentMethodError.message
            : "unknown",
      });
    }
  }

  return status;
}
