import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { getAppUrl } from "@/lib/appUrl";
import { getOrCreateStripeCustomer } from "@/lib/stripeCustomer";
import { stripeConnectOptions } from "@/lib/stripeConnect";
import { requireStripe } from "@/lib/stripe";
import { getSubscriptionStatus } from "@/lib/subscriptionStatus";
import { requireSupabaseServiceClient } from "@/lib/supabaseService";

export async function POST(request: NextRequest) {
  const auth = await assertAuthenticatedActive(request);
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const stripe = requireStripe();
  const service = requireSupabaseServiceClient();
  const { user, supabase } = auth;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, stripe_customer_id, stripe_connect_customer_account_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "atleet") {
    return NextResponse.json(
      { error: "Alleen atleten kunnen hun abonnement beheren." },
      { status: 403 },
    );
  }

  const subscription = await getSubscriptionStatus(service, user.id);
  const connectAccountId =
    subscription?.stripe_connect_account_id?.trim() ||
    (profile?.stripe_connect_customer_account_id as string | null)?.trim() ||
    null;

  if (!connectAccountId) {
    return NextResponse.json(
      { error: "Geen gekoppeld coach Stripe-account gevonden." },
      { status: 404 },
    );
  }

  const hasCustomer =
    Boolean(subscription?.stripe_customer_id) ||
    Boolean(profile?.stripe_customer_id);

  if (!hasCustomer) {
    return NextResponse.json(
      { error: "Geen abonnement gevonden om te beheren." },
      { status: 404 },
    );
  }

  const { customerId } = await getOrCreateStripeCustomer({
    service,
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    stripeConnectAccountId: connectAccountId,
  });

  try {
    const portalSession = await stripe.billingPortal.sessions.create(
      {
        customer: customerId,
        return_url: `${getAppUrl()}/profile?section=subscription`,
      },
      stripeConnectOptions(connectAccountId),
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[stripe/portal] session create failed", {
      userId: user.id,
      connectAccountId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Beheerportaal kon niet worden geopend." },
      { status: 500 },
    );
  }
}
