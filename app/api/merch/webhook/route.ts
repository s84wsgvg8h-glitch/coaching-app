import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function insertOrderEvent(
  service: SupabaseClient,
  orderId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
) {
  await service.from("merch_order_events").insert({
    order_id: orderId,
    event_type: eventType,
    payload,
  });
}

async function decrementMerchStock(
  service: SupabaseClient,
  orderId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { data: order } = await service
    .from("merch_orders")
    .select("merch_item_id, size, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.merch_item_id || !order.size) {
    return { ok: false, reason: "order_not_found" };
  }

  const { data: item } = await service
    .from("merch_items")
    .select("stock_by_size, preorder")
    .eq("id", order.merch_item_id)
    .maybeSingle();

  if (!item) return { ok: false, reason: "item_not_found" };

  if (item.preorder) {
    return { ok: true };
  }

  const stockBySize = (item.stock_by_size || {}) as Record<string, number>;
  const currentStock = stockBySize[order.size as string];
  if (currentStock === undefined) {
    return { ok: true };
  }

  if (currentStock <= 0) {
    return { ok: false, reason: "out_of_stock" };
  }

  await service
    .from("merch_items")
    .update({
      stock_by_size: {
        ...stockBySize,
        [order.size as string]: Math.max(0, currentStock - 1),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.merch_item_id);

  return { ok: true };
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe niet geconfigureerd." }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Geen signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Ongeldige webhook." }, { status: 400 });
  }

  const service = getServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service client ontbreekt." }, { status: 500 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      const { data: existing } = await service
        .from("merch_orders")
        .select("id, status")
        .eq("id", orderId)
        .maybeSingle();

      if (existing?.status === "paid") {
        return NextResponse.json({ received: true, duplicate: true });
      }

      await service
        .from("merch_orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
          stripe_customer_id:
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      const stockResult = await decrementMerchStock(service, orderId);

      await insertOrderEvent(service, orderId, "payment_received", {
        stripe_session_id: session.id,
        stock_ok: stockResult.ok,
        stock_reason: stockResult.reason ?? null,
      });

      const discountId = session.metadata?.discountId;
      if (discountId) {
        const { data: order } = await service
          .from("merch_orders")
          .select("athlete_id")
          .eq("id", orderId)
          .maybeSingle();

        if (order?.athlete_id) {
          await service.from("merch_discount_usage").insert({
            discount_id: discountId,
            order_id: orderId,
            athlete_id: order.athlete_id,
          });

          const { data: discount } = await service
            .from("merch_discounts")
            .select("usage_count")
            .eq("id", discountId)
            .maybeSingle();

          if (discount) {
            await service
              .from("merch_discounts")
              .update({
                usage_count: Number(discount.usage_count ?? 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", discountId);
          }
        }
      }
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (paymentIntentId) {
      const { data: order } = await service
        .from("merch_orders")
        .select("id")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle();

      if (order?.id) {
        await service
          .from("merch_orders")
          .update({
            status: "cancelled",
            refunded_at: new Date().toISOString(),
            fulfillment_status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        await insertOrderEvent(service, order.id, "refunded", {
          payment_intent_id: paymentIntentId,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
