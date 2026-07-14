import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { stripeConnectOptions } from "@/lib/stripeConnect";
import { requireStripe } from "@/lib/stripe";

export type StripeCustomerResult = {
  customerId: string;
  created: boolean;
};

export async function getOrCreateStripeCustomer(params: {
  service: SupabaseClient;
  userId: string;
  email: string | null;
  fullName: string | null;
  stripeConnectAccountId: string;
}): Promise<StripeCustomerResult> {
  const stripe = requireStripe();
  const { service, userId, email, fullName, stripeConnectAccountId } = params;
  const requestOptions = stripeConnectOptions(stripeConnectAccountId);

  const { data: profile } = await service
    .from("profiles")
    .select(
      "stripe_customer_id, stripe_connect_customer_account_id, full_name, betaling_dag",
    )
    .eq("id", userId)
    .maybeSingle();

  const existingCustomerId = profile?.stripe_customer_id?.trim();
  const existingConnectAccount =
    (profile?.stripe_connect_customer_account_id as string | null)?.trim() ||
    null;

  if (
    existingCustomerId &&
    existingConnectAccount === stripeConnectAccountId
  ) {
    try {
      const customer = await stripe.customers.retrieve(
        existingCustomerId,
        {},
        requestOptions,
      );
      if (!customer.deleted) {
        return { customerId: existingCustomerId, created: false };
      }
    } catch {
      // Customer missing on connected account — create a new one below.
    }
  }

  const customer = await stripe.customers.create(
    {
      email: email ?? undefined,
      name: fullName?.trim() || profile?.full_name?.trim() || undefined,
      metadata: {
        supabase_user_id: userId,
        stripe_connect_account_id: stripeConnectAccountId,
      },
    },
    {
      ...requestOptions,
      idempotencyKey: `coaching-customer-${userId}-${stripeConnectAccountId}`,
    },
  );

  await service
    .from("profiles")
    .update({
      stripe_customer_id: customer.id,
      stripe_connect_customer_account_id: stripeConnectAccountId,
    })
    .eq("id", userId);

  return {
    customerId: customer.id,
    created: true,
  };
}

export async function listActiveStripeSubscriptionsForCustomer(
  customerId: string,
  stripeConnectAccountId: string,
): Promise<Stripe.Subscription[]> {
  const stripe = requireStripe();
  const subscriptions = await stripe.subscriptions.list(
    {
      customer: customerId,
      status: "all",
      limit: 20,
    },
    stripeConnectOptions(stripeConnectAccountId),
  );

  return subscriptions.data.filter((subscription) =>
    ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(
      subscription.status,
    ),
  );
}
