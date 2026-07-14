import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireStripe } from "@/lib/stripe";
import {
  stripeConnectOptions,
  syncCoachConnectProfile,
} from "@/lib/stripeConnect";
import { getSubscriptionIdFromInvoice } from "@/lib/stripeSubscriptionPeriod";
import { syncCoachingSubscriptionFromStripe } from "@/lib/subscriptionStatus";
import {
  claimStripeWebhookEvent,
  releaseStripeWebhookEventClaim,
} from "@/lib/stripeWebhookIdempotency";
import { requireSupabaseServiceClient } from "@/lib/supabaseService";

type ConnectContext = {
  stripeConnectAccountId: string | null;
};

function resolveConnectAccountId(
  event: Stripe.Event,
  object: { metadata?: Stripe.Metadata | null },
): string | null {
  return (
    event.account?.trim() ||
    object.metadata?.stripe_connect_account_id?.trim() ||
    null
  );
}

async function fetchSubscription(
  stripe: Stripe,
  subscriptionId: string,
  connectAccountId: string | null,
): Promise<Stripe.Subscription> {
  if (connectAccountId) {
    return stripe.subscriptions.retrieve(
      subscriptionId,
      {},
      stripeConnectOptions(connectAccountId),
    );
  }
  return stripe.subscriptions.retrieve(subscriptionId);
}

async function syncCheckoutSubscriptionSession(
  stripe: Stripe,
  service: ReturnType<typeof requireSupabaseServiceClient>,
  session: Stripe.Checkout.Session,
  connectContext: ConnectContext,
) {
  if (session.mode !== "subscription") return;

  const userId =
    session.metadata?.supabase_user_id?.trim() ||
    session.client_reference_id?.trim() ||
    null;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  const connectAccountId =
    connectContext.stripeConnectAccountId ||
    session.metadata?.stripe_connect_account_id?.trim() ||
    null;

  if (!subscriptionId || !userId) {
    console.warn("[stripe/webhook] checkout session missing ids", {
      eventContext: "checkout.session",
      hasSubscription: Boolean(subscriptionId),
      hasUserId: Boolean(userId),
      paymentStatus: session.payment_status ?? null,
    });
    return;
  }

  const subscription = await fetchSubscription(
    stripe,
    subscriptionId,
    connectAccountId,
  );

  await syncCoachingSubscriptionFromStripe(service, subscription, userId, {
    coachId: session.metadata?.coach_id?.trim() || null,
    stripeConnectAccountId: connectAccountId,
  });
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  service: ReturnType<typeof requireSupabaseServiceClient>,
  session: Stripe.Checkout.Session,
  connectContext: ConnectContext,
) {
  if (session.mode !== "subscription") return;

  // Async bank methods can complete checkout before funds are confirmed.
  if (session.payment_status === "unpaid") {
    console.info("[stripe/webhook] checkout.session.completed deferred payment", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });
    return;
  }

  await syncCheckoutSubscriptionSession(stripe, service, session, connectContext);
}

async function handleCheckoutSessionAsyncPayment(
  stripe: Stripe,
  service: ReturnType<typeof requireSupabaseServiceClient>,
  session: Stripe.Checkout.Session,
  connectContext: ConnectContext,
  outcome: "succeeded" | "failed",
) {
  if (session.mode !== "subscription") return;

  console.info("[stripe/webhook] checkout.session.async_payment", {
    sessionId: session.id,
    outcome,
    paymentStatus: session.payment_status ?? null,
  });

  await syncCheckoutSubscriptionSession(stripe, service, session, connectContext);
}

async function handleSubscriptionEvent(
  stripe: Stripe,
  service: ReturnType<typeof requireSupabaseServiceClient>,
  subscription: Stripe.Subscription,
  connectContext: ConnectContext,
) {
  await syncCoachingSubscriptionFromStripe(service, subscription, null, {
    coachId: subscription.metadata?.coach_id?.trim() || null,
    stripeConnectAccountId:
      connectContext.stripeConnectAccountId ||
      subscription.metadata?.stripe_connect_account_id?.trim() ||
      null,
  });
}

async function handleInvoicePaid(
  stripe: Stripe,
  service: ReturnType<typeof requireSupabaseServiceClient>,
  invoice: Stripe.Invoice,
  connectContext: ConnectContext,
) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const connectAccountId =
    connectContext.stripeConnectAccountId ||
    invoice.metadata?.stripe_connect_account_id?.trim() ||
    null;

  const subscription = await fetchSubscription(
    stripe,
    subscriptionId,
    connectAccountId,
  );
  await syncCoachingSubscriptionFromStripe(service, subscription, null, {
    coachId: subscription.metadata?.coach_id?.trim() || null,
    stripeConnectAccountId: connectAccountId,
  });
}

async function handleInvoicePaymentFailed(
  stripe: Stripe,
  service: ReturnType<typeof requireSupabaseServiceClient>,
  invoice: Stripe.Invoice,
  connectContext: ConnectContext,
) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const connectAccountId =
    connectContext.stripeConnectAccountId ||
    invoice.metadata?.stripe_connect_account_id?.trim() ||
    null;

  const subscription = await fetchSubscription(
    stripe,
    subscriptionId,
    connectAccountId,
  );
  await syncCoachingSubscriptionFromStripe(service, subscription, null, {
    coachId: subscription.metadata?.coach_id?.trim() || null,
    stripeConnectAccountId: connectAccountId,
  });
}

async function handleAccountUpdated(
  service: ReturnType<typeof requireSupabaseServiceClient>,
  account: Stripe.Account,
) {
  const coachId = account.metadata?.coach_id?.trim();
  if (!coachId) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("stripe_connect_account_id", account.id)
      .maybeSingle();
    if (!profile?.id) return;
    await syncCoachConnectProfile(service, profile.id as string, account);
    return;
  }

  await syncCoachConnectProfile(service, coachId, account);
}

export async function POST(request: NextRequest) {
  const stripe = requireStripe();
  const webhookSecret =
    process.env.STRIPE_COACHING_WEBHOOK_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook niet geconfigureerd." }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Geen signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.warn("[stripe/webhook] invalid signature", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Ongeldige webhook." }, { status: 400 });
  }

  const service = requireSupabaseServiceClient();

  const claimed = await claimStripeWebhookEvent(service, event.id, event.type);
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const eventObject = event.data.object as Stripe.Checkout.Session &
    Stripe.Subscription &
    Stripe.Invoice &
    Stripe.Account;
  const connectContext: ConnectContext = {
    stripeConnectAccountId: resolveConnectAccountId(event, eventObject),
  };

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          stripe,
          service,
          eventObject as Stripe.Checkout.Session,
          connectContext,
        );
        break;
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutSessionAsyncPayment(
          stripe,
          service,
          eventObject as Stripe.Checkout.Session,
          connectContext,
          "succeeded",
        );
        break;
      case "checkout.session.async_payment_failed":
        await handleCheckoutSessionAsyncPayment(
          stripe,
          service,
          eventObject as Stripe.Checkout.Session,
          connectContext,
          "failed",
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(
          stripe,
          service,
          eventObject as Stripe.Subscription,
          connectContext,
        );
        break;
      case "invoice.paid":
        await handleInvoicePaid(
          stripe,
          service,
          eventObject as Stripe.Invoice,
          connectContext,
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          stripe,
          service,
          eventObject as Stripe.Invoice,
          connectContext,
        );
        break;
      case "account.updated":
        await handleAccountUpdated(service, eventObject as Stripe.Account);
        break;
      default:
        break;
    }
  } catch (error) {
    await releaseStripeWebhookEventClaim(service, event.id);
    console.error("[stripe/webhook] handler failed", {
      eventId: event.id,
      eventType: event.type,
      account: event.account ?? null,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Webhook verwerking mislukt." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
