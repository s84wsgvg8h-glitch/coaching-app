import { supabase } from "@/lib/supabaseClient";

export type MerchItemStatus = "live" | "concept" | "soldout" | "archived";

export type MerchColorVariant = {
  name: string;
  value: string;
  image_url?: string | null;
};

export type MerchStockBySize = Record<string, number>;

export type MerchItem = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  cost_price: number | null;
  image_url: string | null;
  image_urls: string[];
  buy_url: string | null;
  sizes: string[];
  stock_by_size: MerchStockBySize;
  color_variants: MerchColorVariant[];
  collection: string | null;
  status: MerchItemStatus;
  active: boolean;
  featured: boolean;
  limited: boolean;
  preorder: boolean;
  preorder_target: number | null;
  preorder_closes_at: string | null;
  go_live_at: string | null;
  archived_at: string | null;
  material_info: string | null;
  size_guide_text: string | null;
  delivery_time_text: string | null;
  return_policy_override: string | null;
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

  if (!includeInactive) query = query.eq("active", true);

  const { data, error } = await query;

  if (error) {
    console.error("Merch laden mislukt:", error.message);
    return [] as MerchItem[];
  }

  const normalized = (data || []).map(normalizeMerchItem);
  return includeInactive
    ? normalized
    : normalized.filter((item) => isMerchItemVisibleToAthletes(item));
}

export async function saveMerchItem(
  item: Omit<MerchItem, "id" | "created_at" | "updated_at"> & { id?: string },
) {
  const status = item.status || (item.active ? "live" : "concept");
  const payload = {
    title: item.title.trim(),
    description: item.description?.trim() || null,
    price: item.price,
    cost_price: item.cost_price,
    image_url: item.image_url?.trim() || null,
    buy_url: item.buy_url?.trim() || null,
    image_urls: item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : [],
    sizes: item.sizes?.length ? item.sizes : [],
    stock_by_size: item.stock_by_size || {},
    color_variants: item.color_variants || [],
    collection: item.collection?.trim() || null,
    status,
    active: status === "live" || status === "soldout",
    featured: item.featured,
    limited: item.limited,
    preorder: item.preorder,
    preorder_target: item.preorder_target,
    preorder_closes_at: item.preorder_closes_at,
    go_live_at: item.go_live_at,
    archived_at: status === "archived" ? item.archived_at || new Date().toISOString() : null,
    material_info: item.material_info?.trim() || null,
    size_guide_text: item.size_guide_text?.trim() || null,
    delivery_time_text: item.delivery_time_text?.trim() || null,
    return_policy_override: item.return_policy_override?.trim() || null,
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

export async function duplicateMerchItem(item: MerchItem) {
  return supabase.from("merch_items").insert({
    title: `${item.title} (kopie)`,
    description: item.description,
    price: item.price,
    cost_price: item.cost_price,
    image_url: item.image_url,
    image_urls: item.image_urls?.length
      ? item.image_urls
      : item.image_url
        ? [item.image_url]
        : [],
    buy_url: item.buy_url,
    material_info: item.material_info,
    size_guide_text: item.size_guide_text,
    delivery_time_text: item.delivery_time_text,
    return_policy_override: item.return_policy_override,
    sizes: item.sizes?.length ? item.sizes : [],
    stock_by_size: item.stock_by_size || {},
    color_variants: item.color_variants || [],
    collection: item.collection,
    status: "concept",
    active: false,
    featured: false,
    limited: item.limited,
    preorder: item.preorder,
    preorder_target: item.preorder_target,
    preorder_closes_at: item.preorder_closes_at,
    go_live_at: null,
    archived_at: null,
    sort_order: (item.sort_order ?? 0) + 1,
    updated_at: new Date().toISOString(),
  });
}

export async function toggleMerchItemActive(id: string, active: boolean) {
  return supabase
    .from("merch_items")
    .update({
      active,
      status: active ? "live" : "concept",
      archived_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function updateMerchItemStatus(
  id: string,
  status: MerchItemStatus,
) {
  return supabase
    .from("merch_items")
    .update({
      status,
      active: status === "live" || status === "soldout",
      archived_at: status === "archived" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function updateMerchItemFeatured(id: string, featured: boolean) {
  return supabase
    .from("merch_items")
    .update({ featured, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export function parseMerchSizesInput(value: string): string[] {
  return value
    .split(/[,;/]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function formatMerchSizes(sizes: string[] | null | undefined) {
  if (!sizes?.length) return "One size";
  return sizes.join(", ");
}

export function formatMerchPrice(price: number | null) {
  if (price === null || Number.isNaN(price)) return "Prijs op aanvraag";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function normalizeMerchItem(row: Partial<MerchItem>): MerchItem {
  return {
    id: row.id || "",
    title: row.title || "",
    description: row.description ?? null,
    price:
      row.price !== null && row.price !== undefined ? Number(row.price) : null,
    cost_price:
      row.cost_price !== null && row.cost_price !== undefined
        ? Number(row.cost_price)
        : null,
    image_url: row.image_url ?? null,
    image_urls: Array.isArray(row.image_urls)
      ? (row.image_urls as string[])
      : row.image_url
        ? [row.image_url]
        : [],
    buy_url: row.buy_url ?? null,
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    stock_by_size:
      row.stock_by_size && typeof row.stock_by_size === "object"
        ? (row.stock_by_size as MerchStockBySize)
        : {},
    color_variants: Array.isArray(row.color_variants)
      ? (row.color_variants as MerchColorVariant[])
      : [],
    collection: row.collection ?? null,
    status: (row.status || (row.active ? "live" : "concept")) as MerchItemStatus,
    active: Boolean(row.active),
    featured: Boolean(row.featured),
    limited: Boolean(row.limited),
    preorder: Boolean(row.preorder),
    preorder_target:
      row.preorder_target !== null && row.preorder_target !== undefined
        ? Number(row.preorder_target)
        : null,
    preorder_closes_at: row.preorder_closes_at ?? null,
    go_live_at: row.go_live_at ?? null,
    archived_at: row.archived_at ?? null,
    material_info: row.material_info ?? null,
    size_guide_text: row.size_guide_text ?? null,
    delivery_time_text: row.delivery_time_text ?? null,
    return_policy_override: row.return_policy_override ?? null,
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export function getMerchItemAvailableSizes(item: MerchItem) {
  const sizes = item.sizes?.length ? item.sizes : ["One size"];
  return sizes.filter((size) => {
    const stock = item.stock_by_size?.[size];
    return stock === undefined || stock > 0;
  });
}

export function getMerchItemTotalStock(item: MerchItem) {
  const values = Object.values(item.stock_by_size || {});
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

export function getMerchItemGallery(item: MerchItem) {
  if (item.image_urls?.length) return item.image_urls;
  if (item.image_url) return [item.image_url];
  return [] as string[];
}

export function getMerchStockForSize(item: MerchItem, size: string) {
  const stock = item.stock_by_size?.[size];
  return stock === undefined ? null : stock;
}

export function getMerchLowStockLabel(item: MerchItem) {
  const total = getMerchItemTotalStock(item);
  if (total === null) return null;
  if (total === 0) return "Uitverkocht";
  if (total <= 3) return `Nog maar ${total} beschikbaar`;
  return null;
}

export function isMerchItemOrderable(item: MerchItem) {
  if (!item.active) return false;
  if (item.status === "live") {
    return getMerchItemAvailableSizes(item).length > 0;
  }
  if (item.preorder && item.status !== "soldout" && item.status !== "archived") {
    if (item.preorder_closes_at) {
      const closes = new Date(item.preorder_closes_at);
      if (!Number.isNaN(closes.getTime()) && closes < new Date()) {
        return false;
      }
    }
    return true;
  }
  return false;
}

export function isMerchItemVisibleToAthletes(item: MerchItem) {
  return (
    item.status === "live" ||
    item.status === "soldout" ||
    (item.preorder && item.status !== "concept" && item.status !== "archived")
  );
}

export function getMerchStatusLabel(status: MerchItemStatus) {
  switch (status) {
    case "live":
      return "Live";
    case "concept":
      return "Concept";
    case "soldout":
      return "Uitverkocht";
    case "archived":
      return "Gearchiveerd";
    default:
      return status;
  }
}
