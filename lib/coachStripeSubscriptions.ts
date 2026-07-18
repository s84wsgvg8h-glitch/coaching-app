import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getCoachingPlanLabelForKey } from "@/lib/coachingPlanFromPrice";
import {
  coachAthleteSubscriptionStatusLabel,
  type CoachAthleteSubscriptionRow,
} from "@/lib/coachStripeSubscriptionsShared";
import { stripeConnectOptions } from "@/lib/stripeConnect";
import { requireStripe } from "@/lib/stripe";
import { getSubscriptionPeriodBounds } from "@/lib/stripeSubscriptionPeriod";

export type {
  CoachAthleteSubscriptionRow,
  CoachSubscriptionStatusFilter,
} from "@/lib/coachStripeSubscriptionsShared";
export {
  coachAthleteSubscriptionStatusLabel,
  filterCoachSubscriptions,
} from "@/lib/coachStripeSubscriptionsShared";

type AthleteProfileLookup = {
  id: string;
  full_name: string | null;
  stripe_customer_id: string | null;
};

function formatStripeDate(unix: number | null | undefined): string | null {
  if (!unix) return null;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(unix * 1000));
}

function formatMonthlyAmount(
  price: Stripe.Price | null | undefined,
): string {
  if (!price?.unit_amount || !price.currency) {
    return "—";
  }

  const amount = price.unit_amount / 100;
  const interval = price.recurring?.interval;
  const suffix =
    interval === "month"
      ? "/maand"
      : interval === "year"
        ? "/jaar"
        : interval
          ? `/${interval}`
          : "";

  const formatted =
    price.currency.toLowerCase() === "eur"
      ? `€${Number.isInteger(amount) ? amount : amount.toFixed(2)}`
      : `${amount.toFixed(2)} ${price.currency.toUpperCase()}`;

  return `${formatted}${suffix}`;
}

function resolveCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  if ("deleted" in customer && customer.deleted) return null;
  return customer.id;
}

function resolveCustomerDetails(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): { name: string; email: string } {
  if (!customer || typeof customer === "string") {
    return { name: "", email: "" };
  }
  if ("deleted" in customer && customer.deleted) {
    return { name: "", email: "" };
  }

  return {
    name: customer.name?.trim() || "",
    email: customer.email?.trim() || "",
  };
}

function resolvePackageName(
  subscription: Stripe.Subscription,
  productNamesById: Map<string, string>,
): string {
  const planId = subscription.metadata?.plan_id?.trim();
  if (planId) {
    return getCoachingPlanLabelForKey(planId);
  }

  const item = subscription.items?.data?.[0];
  const price = item?.price;
  const product = price?.product;

  if (product && typeof product !== "string" && !("deleted" in product)) {
    const productName = product.name?.trim();
    if (productName) return productName;
  }

  if (typeof product === "string") {
    const productName = productNamesById.get(product);
    if (productName) return productName;
  }

  if (price?.nickname?.trim()) {
    return price.nickname.trim();
  }

  if (price?.lookup_key?.trim()) {
    const fromLookup = getCoachingPlanLabelForKey(price.lookup_key.trim());
    if (fromLookup !== "Coaching abonnement") {
      return fromLookup;
    }
  }

  return "Coaching abonnement";
}

async function fetchProductNamesById(
  connectAccountId: string,
  subscriptions: Stripe.Subscription[],
): Promise<Map<string, string>> {
  const stripe = requireStripe();
  const requestOptions = stripeConnectOptions(connectAccountId);
  const productIds = new Set<string>();

  for (const subscription of subscriptions) {
    const product = subscription.items?.data?.[0]?.price?.product;
    if (typeof product === "string" && product.trim()) {
      productIds.add(product.trim());
    }
  }

  const entries = await Promise.all(
    [...productIds].map(async (productId) => {
      try {
        const product = await stripe.products.retrieve(
          productId,
          {},
          requestOptions,
        );
        const name = product.name?.trim();
        return name ? ([productId, name] as const) : null;
      } catch {
        return null;
      }
    }),
  );

  const productNamesById = new Map<string, string>();
  for (const entry of entries) {
    if (entry) {
      productNamesById.set(entry[0], entry[1]);
    }
  }

  return productNamesById;
}

function mapSubscriptionToRow(
  subscription: Stripe.Subscription,
  athleteByUserId: Map<string, AthleteProfileLookup>,
  athleteByCustomerId: Map<string, AthleteProfileLookup>,
  productNamesById: Map<string, string>,
): CoachAthleteSubscriptionRow {
  const athleteUserId = subscription.metadata?.supabase_user_id?.trim() || null;
  const customerId = resolveCustomerId(subscription.customer) || "";
  const customerDetails = resolveCustomerDetails(subscription.customer);

  const athleteProfile =
    (athleteUserId ? athleteByUserId.get(athleteUserId) : null) ||
    (customerId ? athleteByCustomerId.get(customerId) : null) ||
    null;

  const athleteName =
    athleteProfile?.full_name?.trim() ||
    customerDetails.name ||
    "Onbekende atleet";
  const athleteEmail = customerDetails.email || "—";

  const item = subscription.items?.data?.[0];
  const price = item?.price;
  const { end } = getSubscriptionPeriodBounds(subscription);

  const nextPaymentDate =
    subscription.status === "trialing" && subscription.trial_end
      ? formatStripeDate(subscription.trial_end)
      : formatStripeDate(end);

  return {
    id: subscription.id,
    athleteUserId,
    athleteName,
    athleteEmail,
    packageName: resolvePackageName(subscription, productNamesById),
    monthlyAmountLabel: formatMonthlyAmount(price),
    status: subscription.status,
    statusLabel: coachAthleteSubscriptionStatusLabel(subscription.status),
    trialEnd: formatStripeDate(subscription.trial_end),
    nextPaymentDate,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    stripeCustomerId: customerId,
  };
}

async function listAllCoachConnectSubscriptions(
  connectAccountId: string,
): Promise<Stripe.Subscription[]> {
  const stripe = requireStripe();
  const requestOptions = stripeConnectOptions(connectAccountId);
  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const page = await stripe.subscriptions.list(
      {
        status: "all",
        limit: 100,
        expand: ["data.customer", "data.latest_invoice"],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      requestOptions,
    );

    subscriptions.push(...page.data);

    if (!page.has_more || page.data.length === 0) {
      break;
    }

    startingAfter = page.data[page.data.length - 1]?.id;
    if (!startingAfter) break;
  }

  return subscriptions;
}

export async function loadCoachStripeSubscriptions(
  service: SupabaseClient,
  coachId: string,
): Promise<
  | {
      error: null;
      connectAccountId: string;
      subscriptions: CoachAthleteSubscriptionRow[];
    }
  | { error: string; connectAccountId: null; subscriptions: null }
> {
  const { data: coachProfile, error: coachError } = await service
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", coachId)
    .maybeSingle();

  if (coachError) {
    console.error("[coach/subscriptions] coach profile read failed", coachError);
    return {
      error: "Coachprofiel kon niet worden geladen.",
      connectAccountId: null,
      subscriptions: null,
    };
  }

  const connectAccountId =
    (coachProfile?.stripe_connect_account_id as string | null)?.trim() || null;

  if (!connectAccountId) {
    return {
      error: "Koppel eerst Stripe via Betalingen om abonnementen te bekijken.",
      connectAccountId: null,
      subscriptions: null,
    };
  }

  const { data: athletes, error: athletesError } = await service
    .from("profiles")
    .select("id, full_name, stripe_customer_id")
    .eq("coach_id", coachId)
    .eq("role", "atleet");

  if (athletesError) {
    console.error("[coach/subscriptions] athletes read failed", athletesError);
    return {
      error: "Atleten konden niet worden geladen.",
      connectAccountId: null,
      subscriptions: null,
    };
  }

  const athleteByUserId = new Map<string, AthleteProfileLookup>();
  const athleteByCustomerId = new Map<string, AthleteProfileLookup>();

  for (const athlete of (athletes || []) as AthleteProfileLookup[]) {
    athleteByUserId.set(athlete.id, athlete);
    const customerId = athlete.stripe_customer_id?.trim();
    if (customerId) {
      athleteByCustomerId.set(customerId, athlete);
    }
  }

  try {
    const stripeSubscriptions = await listAllCoachConnectSubscriptions(
      connectAccountId,
    );
    const productNamesById = await fetchProductNamesById(
      connectAccountId,
      stripeSubscriptions,
    );

    const subscriptions = stripeSubscriptions
      .map((subscription) =>
        mapSubscriptionToRow(
          subscription,
          athleteByUserId,
          athleteByCustomerId,
          productNamesById,
        ),
      )
      .sort((a, b) => {
        const nameCompare = a.athleteName.localeCompare(b.athleteName, "nl");
        if (nameCompare !== 0) return nameCompare;
        return a.id.localeCompare(b.id);
      });

    return { error: null, connectAccountId, subscriptions };
  } catch (error) {
    console.error("[coach/subscriptions] stripe list failed", {
      coachId,
      connectAccountId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      error: "Stripe-abonnementen konden niet worden opgehaald.",
      connectAccountId: null,
      subscriptions: null,
    };
  }
}

export async function assertCoachOwnsStripeSubscription(
  service: SupabaseClient,
  coachId: string,
  connectAccountId: string,
  subscriptionId: string,
): Promise<
  | { error: null; customerId: string }
  | { error: string; customerId: null }
> {
  const stripe = requireStripe();

  try {
    const subscription = await stripe.subscriptions.retrieve(
      subscriptionId,
      { expand: ["customer"] },
      stripeConnectOptions(connectAccountId),
    );

    const metadataCoachId = subscription.metadata?.coach_id?.trim();
    if (metadataCoachId && metadataCoachId !== coachId) {
      return { error: "Geen toegang tot dit abonnement.", customerId: null };
    }

    const athleteUserId = subscription.metadata?.supabase_user_id?.trim();
    if (athleteUserId) {
      const { data: athlete } = await service
        .from("profiles")
        .select("coach_id")
        .eq("id", athleteUserId)
        .maybeSingle();

      if (athlete?.coach_id !== coachId) {
        return { error: "Geen toegang tot dit abonnement.", customerId: null };
      }
    } else {
      const customerId = resolveCustomerId(subscription.customer);
      if (customerId) {
        const { data: athlete } = await service
          .from("profiles")
          .select("coach_id")
          .eq("stripe_customer_id", customerId)
          .eq("coach_id", coachId)
          .maybeSingle();

        if (!athlete) {
          return { error: "Geen toegang tot dit abonnement.", customerId: null };
        }
      }
    }

    const customerId = resolveCustomerId(subscription.customer);
    if (!customerId) {
      return { error: "Geen Stripe-klant gevonden voor dit abonnement.", customerId: null };
    }

    return { error: null, customerId };
  } catch (error) {
    console.error("[coach/subscriptions] subscription retrieve failed", {
      coachId,
      subscriptionId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { error: "Abonnement niet gevonden.", customerId: null };
  }
}
