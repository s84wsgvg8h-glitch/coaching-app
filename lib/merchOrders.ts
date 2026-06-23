import { supabase } from "@/lib/supabaseClient";

export type MerchPaymentStatus = "pending" | "paid" | "cancelled" | "failed";
export type MerchFulfillmentStatus =
  | "new"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type MerchOrder = {
  id: string;
  athlete_id: string;
  merch_item_id: string;
  size: string;
  color: string | null;
  amount_cents: number;
  currency: string;
  status: MerchPaymentStatus;
  fulfillment_status: MerchFulfillmentStatus;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;
  customer_note: string | null;
  coach_note: string | null;
  pickup_method: string | null;
  discount_code: string | null;
  discount_cents: number;
  created_at: string;
  paid_at: string | null;
  fulfilled_at: string | null;
  refunded_at: string | null;
  payment_failed_at: string | null;
  updated_at: string | null;
};

export type MerchOrderEvent = {
  id: string;
  order_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AthleteMerchOrderRow = MerchOrder & {
  item_title?: string | null;
  item_image_url?: string | null;
};

export type CoachMerchOrderRow = MerchOrder & {
  athlete_name?: string | null;
  item_title?: string | null;
  item_image_url?: string | null;
};

export async function createMerchOrder(input: {
  athleteId: string;
  merchItemId: string;
  size: string;
  color?: string | null;
  customerNote?: string | null;
  pickupMethod?: string | null;
  amountCents: number;
  discountCode?: string | null;
  discountCents?: number;
}) {
  return supabase
    .from("merch_orders")
    .insert({
      athlete_id: input.athleteId,
      merch_item_id: input.merchItemId,
      size: input.size,
      color: input.color || null,
      customer_note: input.customerNote || null,
      pickup_method: input.pickupMethod || null,
      amount_cents: input.amountCents,
      discount_code: input.discountCode || null,
      discount_cents: input.discountCents ?? 0,
      status: "pending",
      fulfillment_status: "new",
    })
    .select("*")
    .single();
}

export async function updateMerchOrderSession(
  orderId: string,
  stripeSessionId: string,
) {
  return supabase
    .from("merch_orders")
    .update({ stripe_session_id: stripeSessionId })
    .eq("id", orderId);
}

export async function markMerchOrderPaid(orderId: string) {
  return supabase
    .from("merch_orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
}

export async function updateMerchOrderFulfillmentStatus(
  orderId: string,
  fulfillmentStatus: MerchFulfillmentStatus,
) {
  return supabase
    .from("merch_orders")
    .update({
      fulfillment_status: fulfillmentStatus,
      fulfilled_at:
        fulfillmentStatus === "delivered" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
}

export async function bulkUpdateMerchOrderFulfillment(
  orderIds: string[],
  fulfillmentStatus: MerchFulfillmentStatus,
) {
  if (orderIds.length === 0) {
    return { error: null };
  }

  return supabase
    .from("merch_orders")
    .update({
      fulfillment_status: fulfillmentStatus,
      fulfilled_at:
        fulfillmentStatus === "delivered" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .in("id", orderIds);
}

export async function saveMerchCoachNote(orderId: string, coachNote: string) {
  return supabase
    .from("merch_orders")
    .update({
      coach_note: coachNote.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
}

export async function loadAthleteMerchOrders(
  athleteId: string,
): Promise<AthleteMerchOrderRow[]> {
  const { data, error } = await supabase
    .from("merch_orders")
    .select("*, merch_items(title, image_url)")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Atleet orders laden mislukt:", error.message);
    return [];
  }

  return (data || []).map((row) => {
    const item = row.merch_items as { title?: string; image_url?: string | null } | null;
    return {
      ...(row as MerchOrder),
      item_title: item?.title || null,
      item_image_url: item?.image_url || null,
    };
  });
}

export async function loadCoachMerchOrders() {
  const { data, error } = await supabase
    .from("merch_orders")
    .select("*, merch_items(title, image_url)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Merch orders laden mislukt:", error.message);
    return [] as CoachMerchOrderRow[];
  }

  const athleteIds = [
    ...new Set((data || []).map((row) => row.athlete_id as string)),
  ];

  let nameById: Record<string, string | null> = {};
  if (athleteIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", athleteIds);

    nameById = Object.fromEntries(
      (profiles || []).map((profile) => [
        profile.id as string,
        (profile.full_name as string | null) || null,
      ]),
    );
  }

  return (data || []).map((row) => {
    const item = row.merch_items as { title?: string; image_url?: string | null } | null;
    return {
      ...(row as MerchOrder),
      athlete_name: nameById[row.athlete_id as string] || null,
      item_title: item?.title || null,
      item_image_url: item?.image_url || null,
    };
  });
}

export async function loadMerchOrderEvents(orderId: string): Promise<MerchOrderEvent[]> {
  const { data, error } = await supabase
    .from("merch_order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id as string,
    order_id: row.order_id as string,
    event_type: row.event_type as string,
    payload: (row.payload as Record<string, unknown>) || {},
    created_at: row.created_at as string,
  }));
}

export function formatMerchOrderStatus(status: MerchPaymentStatus): string {
  switch (status) {
    case "paid":
      return "Betaald";
    case "pending":
      return "In afwachting";
    case "cancelled":
      return "Geannuleerd";
    case "failed":
      return "Mislukt";
    default:
      return status;
  }
}

export function formatMerchFulfillmentStatus(
  status: MerchFulfillmentStatus,
): string {
  switch (status) {
    case "new":
      return "Nieuw";
    case "processing":
      return "In behandeling";
    case "shipped":
      return "Verzonden";
    case "delivered":
      return "Afgeleverd";
    case "cancelled":
      return "Geannuleerd";
    default:
      return status;
  }
}

export function isPickupOrder(pickupMethod: string | null | undefined) {
  if (!pickupMethod) return false;
  const normalized = pickupMethod.toLowerCase();
  return (
    normalized.includes("ophalen") ||
    normalized.includes("training") ||
    normalized.includes("wedstrijd") ||
    normalized.includes("meet")
  );
}
