"use client";

import { useMemo, useState } from "react";
import { Package, Truck } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import MerchMetricCard from "@/components/merch/MerchMetricCard";
import MerchPickupList from "@/components/merch/MerchPickupList";
import OrderDetailDrawer from "@/components/merch/OrderDetailDrawer";
import MerchOrderStatusBadge from "@/components/merch/athlete/MerchOrderStatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { formatMerchPrice } from "@/lib/merch";
import {
  bulkUpdateMerchOrderFulfillment,
  type CoachMerchOrderRow,
  type MerchFulfillmentStatus,
} from "@/lib/merchOrders";
import type { MerchShopStats } from "@/lib/merchShopStats";

type OrderFilter =
  | "all"
  | "new"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

type OrdersView = "list" | "pickup";

const FILTERS: Array<{ id: OrderFilter; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "new", label: "Nieuw" },
  { id: "paid", label: "Betaald" },
  { id: "processing", label: "In behandeling" },
  { id: "shipped", label: "Verzonden" },
  { id: "delivered", label: "Afgeleverd" },
  { id: "cancelled", label: "Geannuleerd" },
  { id: "refunded", label: "Terugbetaald" },
];

type MerchOrdersTabProps = {
  orders: CoachMerchOrderRow[];
  loading: boolean;
  stats: MerchShopStats;
  onRefresh: () => Promise<void>;
  onToast: (message: string) => void;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function matchesFilter(order: CoachMerchOrderRow, filter: OrderFilter) {
  switch (filter) {
    case "new":
      return order.fulfillment_status === "new";
    case "paid":
      return order.status === "paid";
    case "processing":
      return order.fulfillment_status === "processing";
    case "shipped":
      return order.fulfillment_status === "shipped";
    case "delivered":
      return order.fulfillment_status === "delivered";
    case "cancelled":
      return (
        order.status === "cancelled" || order.fulfillment_status === "cancelled"
      );
    case "refunded":
      return Boolean(order.refunded_at);
    default:
      return true;
  }
}

export default function MerchOrdersTab({
  orders,
  loading,
  stats,
  onRefresh,
  onToast,
}: MerchOrdersTabProps) {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [view, setView] = useState<OrdersView>("list");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CoachMerchOrderRow | null>(
    null,
  );
  const [bulkSaving, setBulkSaving] = useState(false);

  const paidCount = orders.filter((order) => order.status === "paid").length;
  const shippedCount = orders.filter(
    (order) => order.fulfillment_status === "shipped",
  ).length;

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (!matchesFilter(order, filter)) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        order.athlete_name,
        order.item_title,
        order.id,
        order.size,
        order.color,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [orders, filter, query]);

  function toggleSelect(orderId: string) {
    setSelectedIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  }

  async function handleBulkStatus(status: MerchFulfillmentStatus) {
    if (selectedIds.length === 0) {
      onToast("Selecteer eerst een of meer orders.");
      return;
    }
    setBulkSaving(true);
    const { error } = await bulkUpdateMerchOrderFulfillment(selectedIds, status);
    setBulkSaving(false);
    if (error) {
      onToast(error.message);
      return;
    }
    setSelectedIds([]);
    await onRefresh();
    onToast(`${selectedIds.length} orders bijgewerkt.`);
  }

  return (
    <>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-app-text">
            Bestellingen
          </h1>
          <p className="mt-1 text-[14px] text-app-muted">
            Bekijk, verwerk en haal bestellingen op.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`rounded-xl px-3 py-2 text-[12px] font-medium ${
              view === "list"
                ? "bg-app-accent/15 text-app-accent ring-1 ring-app-accent/30"
                : "text-app-muted"
            }`}
          >
            Lijst
          </button>
          <button
            type="button"
            onClick={() => setView("pickup")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium ${
              view === "pickup"
                ? "bg-app-accent/15 text-app-accent ring-1 ring-app-accent/30"
                : "text-app-muted"
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            Afhaallijst
          </button>
        </div>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MerchMetricCard
          label="Nieuwe orders"
          value={stats.newOrderCount}
          icon={Package}
          tone="text-sky-400"
          bg="bg-sky-500/10"
        />
        <MerchMetricCard
          label="Betaald"
          value={paidCount}
          icon={Package}
          tone="text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <MerchMetricCard
          label="Verzonden"
          value={shippedCount}
          icon={Truck}
          tone="text-violet-400"
          bg="bg-violet-500/10"
        />
        <MerchMetricCard
          label="Omzet"
          value={formatMerchPrice(stats.monthlyRevenueCents / 100)}
          sub="Deze maand"
          icon={Package}
          tone="text-amber-400"
          bg="bg-amber-500/10"
        />
      </div>

      {view === "pickup" ? (
        <MerchPickupList orders={orders} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-1 border-b border-app-border/70 pb-3">
            {FILTERS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setFilter(entry.id)}
                className={`rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                  filter === entry.id
                    ? "bg-app-surface text-app-text ring-1 ring-app-border"
                    : "text-app-muted hover:text-app-text"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {selectedIds.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-app-accent/30 bg-app-accent/5 p-3">
              <span className="text-[13px] text-app-text">
                {selectedIds.length} geselecteerd
              </span>
              <button
                type="button"
                disabled={bulkSaving}
                onClick={() => void handleBulkStatus("processing")}
                className="app-btn-secondary !py-1.5 text-[12px]"
              >
                In behandeling
              </button>
              <button
                type="button"
                disabled={bulkSaving}
                onClick={() => void handleBulkStatus("shipped")}
                className="app-btn-secondary !py-1.5 text-[12px]"
              >
                Verzonden
              </button>
              <button
                type="button"
                disabled={bulkSaving}
                onClick={() => void handleBulkStatus("delivered")}
                className="app-btn-secondary !py-1.5 text-[12px]"
              >
                Afgeleverd
              </button>
            </div>
          ) : null}

          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Zoek op atleet, product, order-ID of maat..."
            variant="rounded"
            className="mb-4 w-full"
          />

          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-2xl border border-app-border/60 bg-app-surface/30"
                />
              ))}
            </div>
          ) : visibleOrders.length === 0 ? (
            <EmptyState
              title="Geen bestellingen"
              description="Zodra atleten merch bestellen, verschijnen orders hier."
            />
          ) : (
            <div className="space-y-2">
              {visibleOrders.map((order) => (
                <article
                  key={order.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4 transition hover:border-sky-500/30"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(order.id)}
                    onChange={() => toggleSelect(order.id)}
                    className="h-4 w-4 rounded border-app-border accent-brand-purple"
                    aria-label={`Selecteer order ${order.id}`}
                  />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[12px] font-semibold text-sky-300">
                    {initials(order.athlete_name || "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-app-text">
                      {order.athlete_name || "Onbekende atleet"}
                    </p>
                    <p className="truncate text-[12px] text-app-muted">
                      {order.item_title || "Product"} · {order.size}
                      {order.color ? ` · ${order.color}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-semibold text-app-text">
                      {formatMerchPrice(order.amount_cents / 100)}
                    </p>
                    <p className="text-[11px] text-app-muted">
                      {new Date(order.created_at).toLocaleDateString("nl-NL")}
                    </p>
                  </div>
                  <MerchOrderStatusBadge order={order} />
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="app-btn-secondary py-2 text-[12px]"
                  >
                    Open
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {selectedOrder ? (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onRefresh={onRefresh}
          onToast={onToast}
        />
      ) : null}
    </>
  );
}
