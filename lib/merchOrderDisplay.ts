import type {
  MerchFulfillmentStatus,
  MerchPaymentStatus,
} from "@/lib/merchOrders";

export type MerchCombinedOrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "failed"
  | "refunded";

export function getMerchCombinedStatus(input: {
  status: MerchPaymentStatus;
  fulfillment_status: MerchFulfillmentStatus;
  refunded_at?: string | null;
}): MerchCombinedOrderStatus {
  if (input.refunded_at) return "refunded";
  if (input.status === "failed") return "failed";
  if (input.status === "cancelled" || input.fulfillment_status === "cancelled") {
    return "cancelled";
  }
  if (input.status === "pending") return "pending";
  if (input.fulfillment_status === "delivered") return "delivered";
  if (input.fulfillment_status === "shipped") return "shipped";
  if (input.fulfillment_status === "processing") return "processing";
  if (input.status === "paid") return "paid";
  return "pending";
}

export function formatMerchCombinedStatus(status: MerchCombinedOrderStatus): string {
  switch (status) {
    case "pending":
      return "In afwachting";
    case "paid":
      return "Betaald";
    case "processing":
      return "In behandeling";
    case "shipped":
      return "Verzonden";
    case "delivered":
      return "Afgeleverd";
    case "cancelled":
      return "Geannuleerd";
    case "failed":
      return "Mislukt";
    case "refunded":
      return "Terugbetaald";
    default:
      return status;
  }
}

export function merchCombinedStatusBadgeClass(status: MerchCombinedOrderStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
    case "paid":
      return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
    case "processing":
      return "bg-violet-500/15 text-violet-300 ring-violet-500/30";
    case "shipped":
      return "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30";
    case "delivered":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "cancelled":
      return "bg-app-surface-muted text-app-muted ring-app-border/60";
    case "failed":
      return "bg-rose-500/15 text-rose-300 ring-rose-500/30";
    case "refunded":
      return "bg-orange-500/15 text-orange-300 ring-orange-500/30";
    default:
      return "bg-app-surface-muted text-app-muted ring-app-border/60";
  }
}

export const MERCH_ORDER_TIMELINE_STEPS = [
  { key: "placed", label: "Bestelling geplaatst" },
  { key: "paid", label: "Betaling ontvangen" },
  { key: "processing", label: "In behandeling" },
  { key: "shipped", label: "Verzonden / opgehaald" },
  { key: "delivered", label: "Afgeleverd" },
] as const;

export function getMerchTimelineStepState(
  stepKey: (typeof MERCH_ORDER_TIMELINE_STEPS)[number]["key"],
  order: {
    status: MerchPaymentStatus;
    fulfillment_status: MerchFulfillmentStatus;
    paid_at: string | null;
    fulfilled_at: string | null;
    refunded_at?: string | null;
  },
): "done" | "current" | "upcoming" | "cancelled" {
  const combined = getMerchCombinedStatus(order);
  if (combined === "cancelled" || combined === "failed" || combined === "refunded") {
    return stepKey === "placed" ? "done" : "cancelled";
  }

  const rank: Record<string, number> = {
    placed: 0,
    paid: 1,
    processing: 2,
    shipped: 3,
    delivered: 4,
  };

  let current = "placed";
  if (order.fulfillment_status === "delivered" || order.fulfilled_at) {
    current = "delivered";
  } else if (order.fulfillment_status === "shipped") {
    current = "shipped";
  } else if (order.fulfillment_status === "processing") {
    current = "processing";
  } else if (order.status === "paid" || order.paid_at) {
    current = "paid";
  }

  const stepRank = rank[stepKey] ?? 0;
  const currentRank = rank[current] ?? 0;

  if (stepRank < currentRank) return "done";
  if (stepRank === currentRank) return "current";
  return "upcoming";
}
