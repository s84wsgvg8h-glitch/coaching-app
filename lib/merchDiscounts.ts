import { supabase } from "@/lib/supabaseClient";
import type { MerchItem } from "@/lib/merch";

export type MerchDiscountRow = {
  id: string;
  coach_id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number;
  collection: string | null;
  product_id: string | null;
  active: boolean;
};

export type MerchDiscountValidation = {
  valid: boolean;
  error?: string;
  discountCents?: number;
  finalAmountCents?: number;
  code?: string;
  discountId?: string;
};

export async function loadMerchDiscountsFromDb(coachId: string) {
  const { data, error } = await supabase
    .from("merch_discounts")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Kortingen laden mislukt:", error.message);
    return [] as MerchDiscountRow[];
  }

  return (data || []).map((row) => ({
    id: row.id as string,
    coach_id: row.coach_id as string,
    code: row.code as string,
    type: row.type as "percent" | "fixed",
    value: Number(row.value),
    valid_from: (row.valid_from as string | null) ?? null,
    valid_until: (row.valid_until as string | null) ?? null,
    usage_limit: row.usage_limit !== null ? Number(row.usage_limit) : null,
    usage_count: Number(row.usage_count ?? 0),
    collection: (row.collection as string | null) ?? null,
    product_id: (row.product_id as string | null) ?? null,
    active: Boolean(row.active),
  }));
}

export async function saveMerchDiscountToDb(
  coachId: string,
  discount: Omit<MerchDiscountRow, "coach_id" | "usage_count"> & {
    usage_count?: number;
  },
) {
  const payload = {
    coach_id: coachId,
    code: discount.code.trim().toUpperCase(),
    type: discount.type,
    value: discount.value,
    valid_from: discount.valid_from,
    valid_until: discount.valid_until,
    usage_limit: discount.usage_limit,
    usage_count: discount.usage_count ?? 0,
    collection: discount.collection,
    product_id: discount.product_id,
    active: discount.active,
    updated_at: new Date().toISOString(),
  };

  if (discount.id) {
    return supabase.from("merch_discounts").update(payload).eq("id", discount.id);
  }

  return supabase.from("merch_discounts").insert(payload);
}

export async function deleteMerchDiscountFromDb(id: string) {
  return supabase.from("merch_discounts").delete().eq("id", id);
}

export function validateMerchDiscountForCheckout(input: {
  discount: MerchDiscountRow;
  item: MerchItem;
  amountCents: number;
  now?: Date;
}): MerchDiscountValidation {
  const { discount, item, amountCents } = input;
  const now = input.now ?? new Date();

  if (!discount.active) {
    return { valid: false, error: "Deze kortingscode is niet actief." };
  }

  if (discount.valid_from && new Date(discount.valid_from) > now) {
    return { valid: false, error: "Deze kortingscode is nog niet geldig." };
  }

  if (discount.valid_until && new Date(discount.valid_until) < now) {
    return { valid: false, error: "Deze kortingscode is verlopen." };
  }

  if (
    discount.usage_limit !== null &&
    discount.usage_count >= discount.usage_limit
  ) {
    return { valid: false, error: "Deze kortingscode is opgebruikt." };
  }

  if (discount.product_id && discount.product_id !== item.id) {
    return { valid: false, error: "Deze code geldt niet voor dit product." };
  }

  if (
    discount.collection &&
    item.collection?.trim().toLowerCase() !== discount.collection.trim().toLowerCase()
  ) {
    return { valid: false, error: "Deze code geldt niet voor deze collectie." };
  }

  let discountCents = 0;
  if (discount.type === "percent") {
    discountCents = Math.round(amountCents * (discount.value / 100));
  } else {
    discountCents = Math.round(discount.value * 100);
  }

  discountCents = Math.min(discountCents, amountCents);
  const finalAmountCents = Math.max(0, amountCents - discountCents);

  return {
    valid: true,
    discountCents,
    finalAmountCents,
    code: discount.code,
    discountId: discount.id,
  };
}
