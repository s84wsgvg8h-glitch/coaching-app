import { supabase } from "@/lib/supabaseClient";

export type MerchTabId =
  | "shop"
  | "orders"
  | "discounts"
  | "collections"
  | "analytics"
  | "settings";

export type MerchDiscountType = "percent" | "fixed";

export type MerchDiscount = {
  id: string;
  code: string;
  type: MerchDiscountType;
  value: number;
  validFrom: string | null;
  validUntil: string | null;
  usageLimit: number | null;
  usageCount: number;
  collection: string | null;
  productId: string | null;
  athleteIds: string[];
  active: boolean;
  createdAt: string;
};

export type MerchCollectionMeta = {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  sortOrder: number;
  visible: boolean;
};

export type MerchShopSettings = {
  pickupAtTraining: boolean;
  defaultShippingCents: number;
  returnPolicy: string;
  currency: string;
  stockAlerts: boolean;
  newOrderNotifications: boolean;
};

export const DEFAULT_MERCH_COLLECTIONS: MerchCollectionMeta[] = [
  {
    id: "teamwear",
    name: "Teamwear",
    description: "Teamkleding en clubwear voor training en wedstrijd.",
    coverUrl: null,
    sortOrder: 0,
    visible: true,
  },
  {
    id: "meet-day",
    name: "Meet day",
    description: "Alles voor wedstrijddag en competities.",
    coverUrl: null,
    sortOrder: 1,
    visible: true,
  },
  {
    id: "accessoires",
    name: "Accessoires",
    description: "Caps, bags en andere extras.",
    coverUrl: null,
    sortOrder: 2,
    visible: true,
  },
  {
    id: "limited",
    name: "Limited edition",
    description: "Beperkte drops en exclusieve items.",
    coverUrl: null,
    sortOrder: 3,
    visible: true,
  },
  {
    id: "concepten",
    name: "Concepten",
    description: "Items in ontwikkeling — nog niet live.",
    coverUrl: null,
    sortOrder: 4,
    visible: false,
  },
];

const DEFAULT_SETTINGS: MerchShopSettings = {
  pickupAtTraining: true,
  defaultShippingCents: 495,
  returnPolicy:
    "30 dagen retourrecht. Product moet ongebruikt en in originele staat zijn.",
  currency: "EUR",
  stockAlerts: true,
  newOrderNotifications: true,
};

function storageKey(userId: string, suffix: string) {
  return `merch-${suffix}-v1:${userId}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function toDateInput(value: string | null) {
  if (!value) return null;
  return value.slice(0, 10);
}

function fromDateInput(value: string | null) {
  if (!value) return null;
  return `${value}T00:00:00.000Z`;
}

export function loadMerchDiscounts(userId: string): MerchDiscount[] {
  return readJson(storageKey(userId, "discounts"), []);
}

export function saveMerchDiscounts(userId: string, discounts: MerchDiscount[]) {
  writeJson(storageKey(userId, "discounts"), discounts);
}

export function loadMerchCollections(userId: string): MerchCollectionMeta[] {
  const stored = readJson<MerchCollectionMeta[] | null>(
    storageKey(userId, "collections"),
    null,
  );
  return stored ?? DEFAULT_MERCH_COLLECTIONS;
}

export function saveMerchCollections(
  userId: string,
  collections: MerchCollectionMeta[],
) {
  writeJson(storageKey(userId, "collections"), collections);
}

export function loadMerchShopSettings(userId: string): MerchShopSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...readJson(storageKey(userId, "settings"), {} as Partial<MerchShopSettings>),
  };
}

export function saveMerchShopSettings(userId: string, settings: MerchShopSettings) {
  writeJson(storageKey(userId, "settings"), settings);
}

export function createMerchDiscountId() {
  return `discount-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMerchCollectionId() {
  return `collection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapDiscountRow(row: Record<string, unknown>): MerchDiscount {
  return {
    id: row.id as string,
    code: row.code as string,
    type: row.type as MerchDiscountType,
    value: Number(row.value),
    validFrom: toDateInput((row.valid_from as string | null) ?? null),
    validUntil: toDateInput((row.valid_until as string | null) ?? null),
    usageLimit: row.usage_limit !== null ? Number(row.usage_limit) : null,
    usageCount: Number(row.usage_count ?? 0),
    collection: (row.collection as string | null) ?? null,
    productId: (row.product_id as string | null) ?? null,
    athleteIds: [],
    active: Boolean(row.active),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  };
}

function mapCollectionRow(row: Record<string, unknown>): MerchCollectionMeta {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    coverUrl: (row.cover_url as string | null) ?? null,
    sortOrder: Number(row.sort_order ?? 0),
    visible: Boolean(row.visible),
  };
}

function mapSettingsRow(row: Record<string, unknown>): MerchShopSettings {
  return {
    pickupAtTraining: Boolean(row.pickup_at_training),
    defaultShippingCents: Number(row.default_shipping_cents ?? 495),
    returnPolicy: (row.return_policy as string) ?? DEFAULT_SETTINGS.returnPolicy,
    currency: (row.currency as string) ?? "EUR",
    stockAlerts: Boolean(row.stock_alerts),
    newOrderNotifications: Boolean(row.new_order_notifications),
  };
}

export async function loadMerchDiscountsAsync(
  userId: string,
): Promise<MerchDiscount[]> {
  const { data, error } = await supabase
    .from("merch_discounts")
    .select("*")
    .eq("coach_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Kortingen uit DB laden mislukt, fallback localStorage:", error.message);
    return loadMerchDiscounts(userId);
  }

  if (!data?.length) {
    const local = loadMerchDiscounts(userId);
    return local;
  }

  return data.map((row) => mapDiscountRow(row as Record<string, unknown>));
}

export async function saveMerchDiscountAsync(
  userId: string,
  discount: MerchDiscount,
) {
  const payload = {
    coach_id: userId,
    code: discount.code.trim().toUpperCase(),
    type: discount.type,
    value: discount.value,
    valid_from: fromDateInput(discount.validFrom),
    valid_until: fromDateInput(discount.validUntil),
    usage_limit: discount.usageLimit,
    usage_count: discount.usageCount,
    collection: discount.collection,
    product_id: discount.productId,
    active: discount.active,
    updated_at: new Date().toISOString(),
  };

  const isUuid = /^[0-9a-f-]{36}$/i.test(discount.id);
  const { data, error } = isUuid
    ? await supabase
        .from("merch_discounts")
        .update(payload)
        .eq("id", discount.id)
        .select("id")
        .single()
    : await supabase
        .from("merch_discounts")
        .insert(payload)
        .select("id")
        .single();

  if (error) {
    const next = loadMerchDiscounts(userId).filter((entry) => entry.id !== discount.id);
    saveMerchDiscounts(userId, [discount, ...next]);
    return { id: discount.id, error };
  }

  return { id: data?.id as string, error: null };
}

export async function loadMerchCollectionsAsync(
  userId: string,
): Promise<MerchCollectionMeta[]> {
  const { data, error } = await supabase
    .from("merch_collections")
    .select("*")
    .eq("coach_id", userId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("Collecties uit DB laden mislukt, fallback localStorage:", error.message);
    return loadMerchCollections(userId);
  }

  if (!data?.length) {
    return loadMerchCollections(userId);
  }

  return data.map((row) => mapCollectionRow(row as Record<string, unknown>));
}

export async function saveMerchCollectionAsync(
  userId: string,
  collection: MerchCollectionMeta,
) {
  const payload = {
    coach_id: userId,
    name: collection.name.trim(),
    description: collection.description,
    cover_url: collection.coverUrl,
    sort_order: collection.sortOrder,
    visible: collection.visible,
    updated_at: new Date().toISOString(),
  };

  const isUuid = /^[0-9a-f-]{36}$/i.test(collection.id);
  const { data, error } = isUuid
    ? await supabase
        .from("merch_collections")
        .update(payload)
        .eq("id", collection.id)
        .select("id")
        .single()
    : await supabase
        .from("merch_collections")
        .insert(payload)
        .select("id")
        .single();

  if (error) {
    const local = loadMerchCollections(userId);
    const next = local.some((entry) => entry.id === collection.id)
      ? local.map((entry) => (entry.id === collection.id ? collection : entry))
      : [...local, collection];
    saveMerchCollections(userId, next);
    return { id: collection.id, error };
  }

  return { id: data?.id as string, error: null };
}

export async function deleteMerchCollectionAsync(userId: string, id: string) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  if (isUuid) {
    const { error } = await supabase.from("merch_collections").delete().eq("id", id);
    if (error) {
      console.warn("Collectie verwijderen mislukt:", error.message);
    }
  }

  const next = loadMerchCollections(userId).filter((entry) => entry.id !== id);
  saveMerchCollections(userId, next);
}

export async function loadMerchShopSettingsAsync(
  userId: string,
): Promise<MerchShopSettings> {
  const { data, error } = await supabase
    .from("merch_shop_settings")
    .select("*")
    .eq("coach_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Shopinstellingen uit DB laden mislukt, fallback localStorage:", error.message);
    return loadMerchShopSettings(userId);
  }

  if (!data) {
    return loadMerchShopSettings(userId);
  }

  return mapSettingsRow(data as Record<string, unknown>);
}

export async function saveMerchShopSettingsAsync(
  userId: string,
  settings: MerchShopSettings,
) {
  const payload = {
    coach_id: userId,
    pickup_at_training: settings.pickupAtTraining,
    default_shipping_cents: settings.defaultShippingCents,
    return_policy: settings.returnPolicy,
    currency: settings.currency,
    stock_alerts: settings.stockAlerts,
    new_order_notifications: settings.newOrderNotifications,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("merch_shop_settings")
    .upsert(payload, { onConflict: "coach_id" });

  if (error) {
    saveMerchShopSettings(userId, settings);
    return error;
  }

  saveMerchShopSettings(userId, settings);
  return null;
}
