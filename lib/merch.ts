import { supabase } from "@/lib/supabaseClient";

export type MerchItem = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  buy_url: string | null;
  active: boolean;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function loadMerchItems(includeInactive = false) {
  let query = supabase
    .from("merch_items")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Merch laden mislukt:", error.message);
    return [] as MerchItem[];
  }

  return (data || []) as MerchItem[];
}

export async function saveMerchItem(
  item: Omit<MerchItem, "id" | "created_at" | "updated_at"> & { id?: string },
) {
  const payload = {
    title: item.title.trim(),
    description: item.description?.trim() || null,
    price: item.price,
    image_url: item.image_url?.trim() || null,
    buy_url: item.buy_url?.trim() || null,
    active: item.active,
    sort_order: item.sort_order,
    updated_at: new Date().toISOString(),
  };

  if (item.id) {
    return supabase.from("merch_items").update(payload).eq("id", item.id);
  }

  return supabase.from("merch_items").insert(payload);
}

export async function deleteMerchItem(id: string) {
  return supabase.from("merch_items").delete().eq("id", id);
}

export function formatMerchPrice(price: number | null) {
  if (price === null || Number.isNaN(price)) return "Prijs op aanvraag";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}
