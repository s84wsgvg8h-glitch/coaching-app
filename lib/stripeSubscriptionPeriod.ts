import type Stripe from "stripe";

export function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parentSubscription = invoice.parent?.subscription_details?.subscription;
  if (typeof parentSubscription === "string") {
    return parentSubscription;
  }
  if (
    parentSubscription &&
    typeof parentSubscription === "object" &&
    "id" in parentSubscription
  ) {
    return parentSubscription.id;
  }
  return null;
}

export function getSubscriptionPeriodBounds(subscription: Stripe.Subscription): {
  start: number | null;
  end: number | null;
} {
  const items = subscription.items?.data ?? [];
  if (items.length === 0) {
    if (subscription.trial_end) {
      return {
        start: subscription.trial_start ?? null,
        end: subscription.trial_end,
      };
    }
    return { start: null, end: null };
  }

  let start = items[0].current_period_start;
  let end = items[0].current_period_end;

  for (const item of items.slice(1)) {
    start = Math.min(start, item.current_period_start);
    end = Math.max(end, item.current_period_end);
  }

  return { start, end };
}
