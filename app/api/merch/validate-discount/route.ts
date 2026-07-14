import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import {
  merchValidateDiscountSchema,
  parseJsonBody,
} from "@/lib/apiValidation";
import { validateMerchDiscountForCheckout } from "@/lib/merchDiscounts";
import { normalizeMerchItem } from "@/lib/merch";

export async function POST(request: NextRequest) {
  const auth = await assertAuthenticatedActive(request);
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, user } = auth;

  const parsed = await parseJsonBody(request, merchValidateDiscountSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const body = parsed.data;
  const { data: athleteProfile } = await supabase
    .from("profiles")
    .select("coach_id")
    .eq("id", user.id)
    .maybeSingle();

  const coachId = athleteProfile?.coach_id as string | null;
  if (!coachId) {
    return NextResponse.json(
      { error: "Geen coach gekoppeld voor kortingsvalidatie." },
      { status: 400 },
    );
  }

  const { data: itemRow } = await supabase
    .from("merch_items")
    .select("*")
    .eq("id", body.merchItemId)
    .eq("active", true)
    .maybeSingle();

  if (!itemRow) {
    return NextResponse.json({ error: "Product niet gevonden." }, { status: 404 });
  }

  const item = normalizeMerchItem(itemRow as Parameters<typeof normalizeMerchItem>[0]);
  const amountCents = Math.round((item.price ?? 0) * 100);

  const { data: discountRow } = await supabase
    .from("merch_discounts")
    .select("*")
    .eq("coach_id", coachId)
    .eq("code", body.discountCode.trim().toUpperCase())
    .maybeSingle();

  if (!discountRow) {
    return NextResponse.json({ valid: false, error: "Kortingscode niet gevonden." });
  }

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
        discountRow.usage_limit !== null ? Number(discountRow.usage_limit) : null,
      usage_count: Number(discountRow.usage_count ?? 0),
      collection: (discountRow.collection as string | null) ?? null,
      product_id: (discountRow.product_id as string | null) ?? null,
      active: Boolean(discountRow.active),
    },
    item,
    amountCents,
  });

  if (!validation.valid) {
    return NextResponse.json({ valid: false, error: validation.error });
  }

  return NextResponse.json({
    valid: true,
    code: validation.code,
    discountCents: validation.discountCents,
    finalAmountCents: validation.finalAmountCents,
    finalPriceLabel: new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format((validation.finalAmountCents ?? 0) / 100),
  });
}
