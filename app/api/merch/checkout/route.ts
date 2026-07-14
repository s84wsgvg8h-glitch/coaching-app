import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import {
  merchCheckoutSchema,
  parseJsonBody,
} from "@/lib/apiValidation";
import { getAppUrl } from "@/lib/appUrl";
import { validateMerchDiscountForCheckout } from "@/lib/merchDiscounts";
import { normalizeMerchItem } from "@/lib/merch";
import {
  createMerchOrder,
  updateMerchOrderSession,
} from "@/lib/merchOrders";
import { getStripe } from "@/lib/stripe";

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

function isOrderableStatus(status: string, preorder: boolean) {
  if (status === "live") return true;
  if (preorder && status !== "soldout" && status !== "archived") return true;
  return false;
}

export async function POST(request: NextRequest) {
  const auth = await assertAuthenticatedActive(request);
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, user } = auth;
  const service = getServiceClient();

  const parsed = await parseJsonBody(request, merchCheckoutSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const body = parsed.data;
  const { data: itemRow, error: itemError } = await supabase
    .from("merch_items")
    .select("*")
    .eq("id", body.merchItemId)
    .eq("active", true)
    .single();

  if (itemError || !itemRow) {
    return NextResponse.json({ error: "Product niet gevonden." }, { status: 404 });
  }

  const item = normalizeMerchItem(itemRow as Parameters<typeof normalizeMerchItem>[0]);

  if (!isOrderableStatus(item.status, item.preorder)) {
    return NextResponse.json(
      { error: "Dit product is momenteel niet bestelbaar." },
      { status: 400 },
    );
  }

  const sizes = item.sizes?.length ? item.sizes : ["One size"];
  const selectedSize = body.size.trim();
  if (!sizes.includes(selectedSize)) {
    return NextResponse.json({ error: "Ongeldige maat." }, { status: 400 });
  }

  const stock = item.stock_by_size?.[selectedSize];
  const isPreorder = item.preorder && item.status !== "live";
  if (!isPreorder && stock === 0) {
    return NextResponse.json(
      { error: "Deze maat is uitverkocht." },
      { status: 400 },
    );
  }

  const colorVariants = item.color_variants || [];
  const selectedColor = body.color?.trim() || null;
  if (
    colorVariants.length > 0 &&
    selectedColor &&
    !colorVariants.some((color) => color.name === selectedColor)
  ) {
    return NextResponse.json({ error: "Ongeldige kleur." }, { status: 400 });
  }

  const price = item.price !== null ? Number(item.price) : 0;
  let amountCents = Math.round(price * 100);
  let discountCents = 0;
  let discountCode: string | null = null;
  let discountId: string | null = null;

  if (body.discountCode?.trim() && service) {
    const { data: athleteProfile } = await service
      .from("profiles")
      .select("coach_id")
      .eq("id", user.id)
      .maybeSingle();

    const coachId = athleteProfile?.coach_id as string | null;
    if (coachId) {
      const { data: discountRow } = await service
        .from("merch_discounts")
        .select("*")
        .eq("coach_id", coachId)
        .eq("code", body.discountCode.trim().toUpperCase())
        .maybeSingle();

      if (discountRow) {
        const validation = validateMerchDiscountForCheckout({
          discount: {
            id: discountRow.id as string,
            coach_id: discountRow.coach_id as string,
            code: discountRow.code as string,
            type: discountRow.type as "percent" | "fixed",
            value: Number(discountRow.value),
            valid_from: (discountRow.valid_from as string | null) ?? null,
            valid_until: (discountRow.valid_until as string | null) ?? null,
            usage_limit:
              discountRow.usage_limit !== null
                ? Number(discountRow.usage_limit)
                : null,
            usage_count: Number(discountRow.usage_count ?? 0),
            collection: (discountRow.collection as string | null) ?? null,
            product_id: (discountRow.product_id as string | null) ?? null,
            active: Boolean(discountRow.active),
          },
          item,
          amountCents,
        });

        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error || "Ongeldige kortingscode." },
            { status: 400 },
          );
        }

        discountCents = validation.discountCents ?? 0;
        amountCents = validation.finalAmountCents ?? amountCents;
        discountCode = validation.code ?? null;
        discountId = validation.discountId ?? null;
      }
    }
  }

  const { data: order, error: orderError } = await createMerchOrder({
    athleteId: user.id,
    merchItemId: item.id,
    size: selectedSize,
    color: selectedColor,
    customerNote: body.customerNote?.trim() || null,
    pickupMethod: body.pickupMethod?.trim() || null,
    amountCents,
    discountCode,
    discountCents,
  });

  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message || "Bestelling mislukt." },
      { status: 500 },
    );
  }

  if (service) {
    await insertOrderEvent(service, order.id, "order_placed", {
      size: selectedSize,
      color: selectedColor,
      amount_cents: amountCents,
      discount_code: discountCode,
    });
  }

  const stripe = getStripe();
  const origin = request.headers.get("origin") || getAppUrl();

  if (!stripe || amountCents <= 0) {
    return NextResponse.json({
      orderId: order.id,
      checkoutUrl: null,
      message:
        amountCents <= 0
          ? "Bestelling geregistreerd. Je coach neemt contact op voor betaling."
          : "Stripe is niet geconfigureerd. Bestelling staat als pending.",
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${item.title} — maat ${selectedSize}`,
            images: item.image_url ? [item.image_url] : undefined,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId: order.id,
      athleteId: user.id,
      merchItemId: item.id,
      size: selectedSize,
      color: selectedColor || "",
      discountId: discountId || "",
      discountCode: discountCode || "",
    },
    success_url: `${origin}/merch?success=${order.id}`,
    cancel_url: `${origin}/merch?cancelled=${order.id}`,
  });

  await updateMerchOrderSession(order.id, session.id);

  return NextResponse.json({
    orderId: order.id,
    checkoutUrl: session.url,
  });
}
