import type { MerchItem } from "@/lib/merch";
import type { CoachMerchOrderRow } from "@/lib/merchOrders";

export type MerchShopStats = {
  liveCount: number;
  conceptCount: number;
  soldOutCount: number;
  archivedCount: number;
  totalProducts: number;
  orderCount: number;
  newOrderCount: number;
  monthlyRevenueCents: number;
  monthlyProfitCents: number;
  revenueTrendPct: number | null;
  conversionPct: number | null;
  conversionLabel: string;
  salesByItemId: Record<string, number>;
  revenueByItemId: Record<string, number>;
  profitByItemId: Record<string, number>;
  topBuyer: { name: string; totalCents: number } | null;
  bestSeller: {
    itemId: string;
    title: string;
    imageUrl: string | null;
    sold: number;
    revenueCents: number;
    profitCents: number;
  } | null;
  dailyRevenue: Array<{ day: number; cents: number }>;
};

function isThisMonth(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function isLastMonth(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return (
    date.getFullYear() === last.getFullYear() &&
    date.getMonth() === last.getMonth()
  );
}

function orderProfitCents(order: CoachMerchOrderRow, items: MerchItem[]) {
  const item = items.find((entry) => entry.id === order.merch_item_id);
  const costCents =
    item?.cost_price !== null && item?.cost_price !== undefined
      ? Math.round(Number(item.cost_price) * 100)
      : 0;
  return Math.max(0, order.amount_cents - costCents);
}

export function buildMerchShopStats(
  items: MerchItem[],
  orders: CoachMerchOrderRow[],
  athleteCount: number,
): MerchShopStats {
  const liveCount = items.filter((item) => item.status === "live").length;
  const conceptCount = items.filter((item) => item.status === "concept").length;
  const soldOutCount = items.filter((item) => item.status === "soldout").length;
  const archivedCount = items.filter((item) => item.status === "archived").length;

  const paidOrders = orders.filter((order) => order.status === "paid");
  const newOrders = orders.filter((order) => order.fulfillment_status === "new");

  const salesByItemId: Record<string, number> = {};
  const revenueByItemId: Record<string, number> = {};
  const profitByItemId: Record<string, number> = {};

  for (const order of paidOrders) {
    const profitCents = orderProfitCents(order, items);
    salesByItemId[order.merch_item_id] =
      (salesByItemId[order.merch_item_id] || 0) + 1;
    revenueByItemId[order.merch_item_id] =
      (revenueByItemId[order.merch_item_id] || 0) + order.amount_cents;
    profitByItemId[order.merch_item_id] =
      (profitByItemId[order.merch_item_id] || 0) + profitCents;
  }

  const monthlyPaid = paidOrders.filter((order) =>
    isThisMonth(order.paid_at || order.created_at),
  );
  const lastMonthPaid = paidOrders.filter((order) =>
    isLastMonth(order.paid_at || order.created_at),
  );

  const monthlyRevenueCents = monthlyPaid.reduce(
    (sum, order) => sum + order.amount_cents,
    0,
  );
  const monthlyProfitCents = monthlyPaid.reduce(
    (sum, order) => sum + orderProfitCents(order, items),
    0,
  );
  const lastMonthRevenueCents = lastMonthPaid.reduce(
    (sum, order) => sum + order.amount_cents,
    0,
  );

  let revenueTrendPct: number | null = null;
  if (lastMonthRevenueCents > 0) {
    revenueTrendPct = Math.round(
      ((monthlyRevenueCents - lastMonthRevenueCents) / lastMonthRevenueCents) *
        100,
    );
  } else if (monthlyRevenueCents > 0) {
    revenueTrendPct = 100;
  }

  const buyerTotals = new Map<string, { name: string; cents: number }>();
  for (const order of monthlyPaid) {
    const key = order.athlete_id;
    const current = buyerTotals.get(key) || {
      name: order.athlete_name || "Atleet",
      cents: 0,
    };
    current.cents += order.amount_cents;
    buyerTotals.set(key, current);
  }

  let topBuyer: MerchShopStats["topBuyer"] = null;
  for (const entry of buyerTotals.values()) {
    if (!topBuyer || entry.cents > topBuyer.totalCents) {
      topBuyer = { name: entry.name, totalCents: entry.cents };
    }
  }

  let bestSeller: MerchShopStats["bestSeller"] = null;
  for (const [itemId, sold] of Object.entries(salesByItemId)) {
    const item = items.find((entry) => entry.id === itemId);
    const revenueCents = revenueByItemId[itemId] || 0;
    const profitCents = profitByItemId[itemId] || 0;
    if (!bestSeller || sold > bestSeller.sold) {
      bestSeller = {
        itemId,
        title: item?.title || "Product",
        imageUrl: item?.image_url || null,
        sold,
        revenueCents,
        profitCents,
      };
    }
  }

  const now = new Date();
  const dailyRevenue = Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const cents = monthlyPaid
      .filter((order) => {
        const date = new Date(order.paid_at || order.created_at);
        return (
          date.getDate() === day &&
          isThisMonth(order.paid_at || order.created_at)
        );
      })
      .reduce((sum, order) => sum + order.amount_cents, 0);
    return { day, cents };
  }).filter((entry) => entry.day <= now.getDate());

  const uniqueBuyers = new Set(monthlyPaid.map((order) => order.athlete_id)).size;
  const conversionPct =
    athleteCount > 0 ? Math.round((uniqueBuyers / athleteCount) * 100) : null;

  return {
    liveCount,
    conceptCount,
    soldOutCount,
    archivedCount,
    totalProducts: items.length,
    orderCount: orders.length,
    newOrderCount: newOrders.length,
    monthlyRevenueCents,
    monthlyProfitCents,
    revenueTrendPct,
    conversionPct,
    conversionLabel:
      athleteCount > 0
        ? `${uniqueBuyers} van ${athleteCount} atleten`
        : "Nog geen atleten",
    salesByItemId,
    revenueByItemId,
    profitByItemId,
    topBuyer,
    bestSeller,
    dailyRevenue,
  };
}

export function estimateItemProfitCents(
  price: number | null,
  costPrice: number | null,
  soldCount: number,
) {
  if (price === null || soldCount === 0) return 0;
  return Math.max(0, Math.round((price - (costPrice || 0)) * 100 * soldCount));
}

export type MerchProductFilter =
  | "all"
  | "live"
  | "concept"
  | "soldout"
  | "archived";

export type MerchProductSort =
  | "default"
  | "name"
  | "price"
  | "sold"
  | "profit"
  | "status";

export function filterMerchItems(items: MerchItem[], filter: MerchProductFilter) {
  switch (filter) {
    case "live":
      return items.filter((item) => item.status === "live");
    case "concept":
      return items.filter((item) => item.status === "concept");
    case "soldout":
      return items.filter((item) => item.status === "soldout");
    case "archived":
      return items.filter((item) => item.status === "archived");
    default:
      return items;
  }
}

export function sortMerchItems(
  items: MerchItem[],
  sort: MerchProductSort,
  salesByItemId: Record<string, number>,
  profitByItemId: Record<string, number> = {},
) {
  const copy = [...items];
  switch (sort) {
    case "name":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "nl"));
    case "price":
      return copy.sort((a, b) => (b.price || 0) - (a.price || 0));
    case "sold":
      return copy.sort(
        (a, b) => (salesByItemId[b.id] || 0) - (salesByItemId[a.id] || 0),
      );
    case "profit":
      return copy.sort(
        (a, b) => (profitByItemId[b.id] || 0) - (profitByItemId[a.id] || 0),
      );
    case "status":
      return copy.sort((a, b) => a.status.localeCompare(b.status, "nl"));
    default:
      return copy.sort((a, b) => a.sort_order - b.sort_order);
  }
}

export type MerchMonthlyPoint = {
  month: string;
  label: string;
  revenueCents: number;
  profitCents: number;
  orders: number;
};

export type MerchSizeStat = { size: string; count: number };

export type MerchProductPerformanceRow = {
  itemId: string;
  title: string;
  sold: number;
  revenueCents: number;
  profitCents: number;
  conversionPct: number | null;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("nl-NL", { month: "short" });
}

export function buildMerchMonthlySeries(
  orders: CoachMerchOrderRow[],
  items: MerchItem[],
  months = 6,
): MerchMonthlyPoint[] {
  const paid = orders.filter((order) => order.status === "paid");
  const now = new Date();
  const points: MerchMonthlyPoint[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = monthKey(date);
    const monthOrders = paid.filter((order) => {
      const created = new Date(order.paid_at || order.created_at);
      return monthKey(created) === key;
    });
    const revenueCents = monthOrders.reduce(
      (sum, order) => sum + order.amount_cents,
      0,
    );
    const profitCents = monthOrders.reduce(
      (sum, order) => sum + orderProfitCents(order, items),
      0,
    );
    points.push({
      month: key,
      label: monthLabel(date),
      revenueCents,
      profitCents,
      orders: monthOrders.length,
    });
  }

  return points;
}

export function buildMerchSizeBreakdown(
  orders: CoachMerchOrderRow[],
): MerchSizeStat[] {
  const counts: Record<string, number> = {};
  for (const order of orders) {
    if (order.status !== "paid") continue;
    const size = order.size || "One size";
    counts[size] = (counts[size] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildMerchProductPerformance(
  items: MerchItem[],
  stats: MerchShopStats,
  athleteCount: number,
): MerchProductPerformanceRow[] {
  return items
    .map((item) => {
      const sold = stats.salesByItemId[item.id] || 0;
      return {
        itemId: item.id,
        title: item.title,
        sold,
        revenueCents: stats.revenueByItemId[item.id] || 0,
        profitCents: stats.profitByItemId[item.id] || 0,
        conversionPct:
          athleteCount > 0 && sold > 0
            ? Math.round((sold / athleteCount) * 1000) / 10
            : null,
      };
    })
    .filter((row) => row.sold > 0 || row.revenueCents > 0)
    .sort((a, b) => b.revenueCents - a.revenueCents);
}
