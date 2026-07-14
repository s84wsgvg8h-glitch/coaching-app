import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getSubscriptionPeriodBounds } from "@/lib/stripeSubscriptionPeriod";

export type CoachingSubscriptionRow = {
  id: string;
  user_id: string;
  coach_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

export const SUBSCRIPTION_ACCESS_STATUSES = ["active", "trialing"] as const;

export const SUBSCRIPTION_BLOCKED_STATUSES = [
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "canceled",
] as const;

export function isSubscriptionAccessStatus(status: string): boolean {
  return (SUBSCRIPTION_ACCESS_STATUSES as readonly string[]).includes(status);
}

export function subscriptionStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Actief";
    case "trialing":
      return "Proefperiode";
    case "past_due":
      return "Achterstallig";
    case "unpaid":
      return "Onbetaald";
    case "incomplete":
      return "Onvolledig";
    case "incomplete_expired":
      return "Verlopen";
    case "canceled":
      return "Geannuleerd";
    case "paused":
      return "Gepauzeerd";
    default:
      return status;
  }
}

export async function getSubscriptionStatus(
  service: SupabaseClient,
  userId: string,
): Promise<CoachingSubscriptionRow | null> {
  const { data, error } = await service
    .from("coaching_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error || !data?.length) {
    return null;
  }

  const rows = data as CoachingSubscriptionRow[];
  const accessRow = rows.find((row) => isSubscriptionAccessStatus(row.status));
  if (accessRow) return accessRow;

  const blockingRow = rows.find((row) =>
    (SUBSCRIPTION_BLOCKED_STATUSES as readonly string[]).includes(row.status),
  );
  return blockingRow ?? rows[0] ?? null;
}

export async function hasActiveSubscription(
  service: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const subscription = await getSubscriptionStatus(service, userId);
  return subscription ? isSubscriptionAccessStatus(subscription.status) : false;
}

export async function userHasBlockingCoachingSubscription(
  service: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await service
    .from("coaching_subscriptions")
    .select("id, status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .limit(1);

  return Boolean(data?.length);
}

function stripeCustomerId(subscription: Stripe.Subscription): string {
  const customer = subscription.customer;
  return typeof customer === "string" ? customer : customer.id;
}

function primaryPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

export function mapStripeSubscriptionToRow(
  subscription: Stripe.Subscription,
  userId: string,
  connectContext?: {
    coachId?: string | null;
    stripeConnectAccountId?: string | null;
  },
): Omit<CoachingSubscriptionRow, "id" | "created_at" | "updated_at"> {
  const priceId = primaryPriceId(subscription);
  if (!priceId) {
    throw new Error("Stripe subscription heeft geen price id.");
  }

  const period = getSubscriptionPeriodBounds(subscription);
  const metadataCoachId = subscription.metadata?.coach_id?.trim() || null;
  const metadataConnectAccountId =
    subscription.metadata?.stripe_connect_account_id?.trim() || null;

  return {
    user_id: userId,
    coach_id: connectContext?.coachId ?? metadataCoachId,
    stripe_connect_account_id:
      connectContext?.stripeConnectAccountId ?? metadataConnectAccountId,
    stripe_customer_id: stripeCustomerId(subscription),
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status: subscription.status,
    current_period_start: period.start
      ? new Date(period.start * 1000).toISOString()
      : null,
    current_period_end: period.end
      ? new Date(period.end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
  };
}

export async function upsertCoachingSubscriptionFromStripe(
  service: SupabaseClient,
  subscription: Stripe.Subscription,
  userId: string,
  connectContext?: {
    coachId?: string | null;
    stripeConnectAccountId?: string | null;
  },
): Promise<CoachingSubscriptionRow> {
  const row = mapStripeSubscriptionToRow(subscription, userId, connectContext);

  const { data, error } = await service
    .from("coaching_subscriptions")
    .upsert(row, { onConflict: "stripe_subscription_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Abonnement synchroniseren mislukt.");
  }

  return data as CoachingSubscriptionRow;
}

export async function resolveUserIdForStripeSubscription(
  service: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const metadataUserId =
    subscription.metadata?.supabase_user_id?.trim() ||
    subscription.metadata?.user_id?.trim();

  if (metadataUserId) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("id", metadataUserId)
      .maybeSingle();
    if (profile?.id) return profile.id;
  }

  const customerId = stripeCustomerId(subscription);
  const { data: profileByCustomer } = await service
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return profileByCustomer?.id ?? null;
}

export async function syncCoachingSubscriptionFromStripe(
  service: SupabaseClient,
  subscription: Stripe.Subscription,
  explicitUserId?: string | null,
  connectContext?: {
    coachId?: string | null;
    stripeConnectAccountId?: string | null;
  },
): Promise<CoachingSubscriptionRow | null> {
  const userId =
    explicitUserId ??
    (await resolveUserIdForStripeSubscription(service, subscription));

  if (!userId) {
    return null;
  }

  const metadataCoachId = subscription.metadata?.coach_id?.trim() || null;
  const metadataConnectAccountId =
    subscription.metadata?.stripe_connect_account_id?.trim() || null;

  return upsertCoachingSubscriptionFromStripe(service, subscription, userId, {
    coachId: connectContext?.coachId ?? metadataCoachId,
    stripeConnectAccountId:
      connectContext?.stripeConnectAccountId ?? metadataConnectAccountId,
  });
}
