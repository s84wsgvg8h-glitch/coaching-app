"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Copy,
  Eye,
  Grid3X3,
  LayoutList,
  MoreHorizontal,
  Pencil,
  Plus,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import MerchMetricCard from "@/components/merch/MerchMetricCard";
import MerchShopSidebar from "@/components/merch/MerchShopSidebar";
import EmptyState from "@/components/ui/EmptyState";
import {
  duplicateMerchItem,
  formatMerchPrice,
  getMerchItemTotalStock,
  getMerchStatusLabel,
  updateMerchItemFeatured,
  updateMerchItemStatus,
  type MerchItem,
} from "@/lib/merch";
import type { CoachMerchOrderRow } from "@/lib/merchOrders";
import type { MerchTabId } from "@/lib/merchShopConfig";
import {
  estimateItemProfitCents,
  filterMerchItems,
  sortMerchItems,
  type MerchProductFilter,
  type MerchProductSort,
  type MerchShopStats,
} from "@/lib/merchShopStats";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

const FILTER_TABS: Array<{ id: MerchProductFilter; label: string }> = [
  { id: "all", label: "Alle producten" },
  { id: "live", label: "Live" },
  { id: "concept", label: "Concept" },
  { id: "soldout", label: "Uitverkocht" },
  { id: "archived", label: "Gearchiveerd" },
];

type MerchShopTabProps = {
  items: MerchItem[];
  orders: CoachMerchOrderRow[];
  ordersLoading: boolean;
  stats: MerchShopStats;
  collections: string[];
  togglingId: string | null;
  onOpenCreate: () => void;
  onOpenEdit: (item: MerchItem) => void;
  onNavigate: (tab: MerchTabId) => void;
  onRefresh: () => Promise<void>;
  onToggleLive: (item: MerchItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToast: (message: string) => void;
  initialFilter?: MerchProductFilter;
};

function formatTrendPct(value: number | null) {
  if (value === null) return null;
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value}% t.o.v. vorige maand`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function MerchShopTab({
  items,
  orders,
  ordersLoading,
  stats,
  collections,
  togglingId,
  onOpenCreate,
  onOpenEdit,
  onNavigate,
  onRefresh,
  onToggleLive,
  onDelete,
  onToast,
  initialFilter = "all",
}: MerchShopTabProps) {
  const [filter, setFilter] = useState<MerchProductFilter>(initialFilter);
  const [sort, setSort] = useState<MerchProductSort>("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [menuItemId, setMenuItemId] = useState<string | null>(null);

  useEffect(() => {
    deferEffectUpdate(() => {
      setFilter(initialFilter);
    });
  }, [initialFilter]);

  const visibleItems = useMemo(() => {
    const filtered = filterMerchItems(items, filter).filter((item) =>
      collectionFilter === "all" ? true : item.collection === collectionFilter,
    );
    return sortMerchItems(
      filtered,
      sort,
      stats.salesByItemId,
      stats.profitByItemId,
    );
  }, [items, filter, sort, collectionFilter, stats]);

  const filterCounts: Record<MerchProductFilter, number> = {
    all: stats.totalProducts,
    live: stats.liveCount,
    concept: stats.conceptCount,
    soldout: stats.soldOutCount,
    archived: stats.archivedCount,
  };

  const bestSellerId = stats.bestSeller?.itemId;

  async function handleDuplicate(item: MerchItem) {
    const { error } = await duplicateMerchItem(item);
    if (error) {
      onToast(error.message);
      return;
    }
    await onRefresh();
    onToast("Product gedupliceerd.");
  }

  async function handleStatusChange(item: MerchItem, status: MerchItem["status"]) {
    const { error } = await updateMerchItemStatus(item.id, status);
    if (error) {
      onToast(error.message);
      return;
    }
    await onRefresh();
    onToast(`Productstatus aangepast naar ${getMerchStatusLabel(status)}.`);
  }

  async function handleFeaturedToggle(item: MerchItem) {
    const { error } = await updateMerchItemFeatured(item.id, !item.featured);
    if (error) {
      onToast(error.message);
      return;
    }
    await onRefresh();
    onToast(item.featured ? "Product is niet meer featured." : "Product is featured.");
  }

  function exportProductsCsv() {
    const rows = [
      ["Titel", "Prijs", "Status", "Collectie", "Verkocht"].join(","),
      ...items.map((item) =>
        [
          `"${item.title.replace(/"/g, '""')}"`,
          item.price ?? "",
          item.status,
          item.collection ?? "",
          stats.salesByItemId[item.id] || 0,
        ].join(","),
      ),
    ];
    downloadCsv("merch-producten.csv", rows.join("\n"));
    onToast("Producten geëxporteerd.");
  }

  function exportOrdersCsv() {
    const rows = [
      ["Atleet", "Product", "Maat", "Bedrag", "Status", "Datum"].join(","),
      ...orders.map((order) =>
        [
          `"${(order.athlete_name || "").replace(/"/g, '""')}"`,
          `"${(order.item_title || "").replace(/"/g, '""')}"`,
          order.size,
          (order.amount_cents / 100).toFixed(2),
          order.status,
          order.created_at,
        ].join(","),
      ),
    ];
    downloadCsv("merch-bestellingen.csv", rows.join("\n"));
    onToast("Bestellingen geëxporteerd.");
  }

  return (
    <>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-subtle">
            Limitless Coaching
          </p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-app-text">
            Merch shop
          </h1>
          <p className="mt-1 text-[14px] text-app-muted">
            Beheer je producten, bestellingen en prestaties.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-4 py-2.5 text-[13px] font-medium text-app-text hover:bg-app-surface-muted"
            >
              Acties
              <ChevronDown className="h-4 w-4 text-app-muted" />
            </button>
            {actionsOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Menu sluiten"
                  onClick={() => setActionsOpen(false)}
                />
                <div className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[220px] overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-xl">
                  {[
                    { label: "Producten exporteren", action: exportProductsCsv },
                    { label: "Orders exporteren", action: exportOrdersCsv },
                    {
                      label: "Alle concepten bekijken",
                      action: () => setFilter("concept"),
                    },
                    {
                      label: "Voorraad controleren",
                      action: () => setFilter("soldout"),
                    },
                    {
                      label: "Collecties beheren",
                      action: () => onNavigate("collections"),
                    },
                    {
                      label: "Stripe instellingen",
                      action: () => onNavigate("settings"),
                    },
                  ].map((entry) => (
                    <button
                      key={entry.label}
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-[13px] text-app-text hover:bg-app-surface-muted"
                      onClick={() => {
                        setActionsOpen(false);
                        entry.action();
                      }}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2563EB]"
          >
            <Plus className="h-4 w-4" />
            Product toevoegen
          </button>
        </div>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MerchMetricCard
          label="Live producten"
          value={stats.liveCount}
          sub={`${stats.conceptCount} concepten`}
          icon={ShoppingBag}
          tone="text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <MerchMetricCard
          label="Bestellingen"
          value={stats.orderCount}
          sub={`${stats.newOrderCount} nieuwe`}
          icon={ShoppingBag}
          tone="text-violet-400"
          bg="bg-violet-500/10"
        />
        <MerchMetricCard
          label="Omzet deze maand"
          value={formatMerchPrice(stats.monthlyRevenueCents / 100)}
          sub={formatTrendPct(stats.revenueTrendPct)}
          subUp={stats.revenueTrendPct === null || stats.revenueTrendPct >= 0}
          icon={TrendingUp}
          tone="text-sky-400"
          bg="bg-sky-500/10"
        />
        <MerchMetricCard
          label="Winst deze maand"
          value={formatMerchPrice(stats.monthlyProfitCents / 100)}
          sub={formatTrendPct(stats.revenueTrendPct)}
          subUp={stats.revenueTrendPct === null || stats.revenueTrendPct >= 0}
          icon={Wallet}
          tone="text-amber-400"
          bg="bg-amber-500/10"
        />
        <MerchMetricCard
          label="Conversie ratio"
          value={stats.conversionPct !== null ? `${stats.conversionPct}%` : "—"}
          sub={stats.conversionLabel}
          icon={Users}
          tone="text-teal-400"
          bg="bg-teal-500/10"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-app-border/70 pb-3">
            <div className="flex flex-wrap gap-1">
              {FILTER_TABS.map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                      active
                        ? "bg-app-surface text-app-text shadow-sm ring-1 ring-app-border"
                        : "text-app-muted hover:text-app-text"
                    }`}
                  >
                    {tab.label}{" "}
                    <span className="text-app-subtle">{filterCounts[tab.id]}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={collectionFilter}
                onChange={(event) => setCollectionFilter(event.target.value)}
                className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-[12px] text-app-text"
              >
                <option value="all">Alle collecties</option>
                {collections.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as MerchProductSort)
                }
                className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-[12px] text-app-text"
              >
                <option value="default">Sorteer</option>
                <option value="name">Naam</option>
                <option value="price">Prijs</option>
                <option value="sold">Verkocht</option>
                <option value="profit">Winst</option>
                <option value="status">Status</option>
              </select>

              <div className="flex overflow-hidden rounded-xl border border-app-border">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`px-2.5 py-2 ${viewMode === "grid" ? "bg-app-surface-muted text-app-text" : "text-app-muted"}`}
                  aria-label="Gridweergave"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-2.5 py-2 ${viewMode === "list" ? "bg-app-surface-muted text-app-text" : "text-app-muted"}`}
                  aria-label="Lijstweergave"
                >
                  <LayoutList className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <EmptyState
              title="Geen producten"
              description={
                filter === "all"
                  ? "Voeg je eerste product toe om je merch shop te starten."
                  : "Geen producten in deze filter."
              }
              action={
                filter === "all" ? (
                  <button type="button" onClick={onOpenCreate} className="app-btn-primary">
                    + Product toevoegen
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3"
                  : "space-y-3"
              }
            >
              {visibleItems.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  viewMode={viewMode}
                  sold={stats.salesByItemId[item.id] || 0}
                  profitCents={estimateItemProfitCents(
                    item.price,
                    item.cost_price,
                    stats.salesByItemId[item.id] || 0,
                  )}
                  isBestSeller={item.id === bestSellerId && (stats.salesByItemId[item.id] || 0) > 0}
                  menuOpen={menuItemId === item.id}
                  toggling={togglingId === item.id}
                  onOpen={() => onOpenEdit(item)}
                  onEdit={() => onOpenEdit(item)}
                  onAnalytics={() =>
                    onToast(
                      `${stats.salesByItemId[item.id] || 0} verkocht · ${formatMerchPrice((stats.revenueByItemId[item.id] || 0) / 100)} omzet`,
                    )
                  }
                  onDuplicate={() => void handleDuplicate(item)}
                  onToggleMenu={() =>
                    setMenuItemId((current) =>
                      current === item.id ? null : item.id,
                    )
                  }
                  onCloseMenu={() => setMenuItemId(null)}
                  onToggleLive={() => void onToggleLive(item)}
                  onSoldOut={() => void handleStatusChange(item, "soldout")}
                  onFeatured={() => void handleFeaturedToggle(item)}
                  onArchive={() => void handleStatusChange(item, "archived")}
                  onDelete={() => void onDelete(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        <MerchShopSidebar
          orders={orders}
          loading={ordersLoading}
          stats={stats}
          initials={initials}
          onRefresh={onRefresh}
          onToast={onToast}
        />
      </div>
    </>
  );
}

function ProductCard({
  item,
  viewMode,
  sold,
  profitCents,
  isBestSeller,
  menuOpen,
  toggling,
  onOpen,
  onEdit,
  onAnalytics,
  onDuplicate,
  onToggleMenu,
  onCloseMenu,
  onToggleLive,
  onSoldOut,
  onFeatured,
  onArchive,
  onDelete,
}: {
  item: MerchItem;
  viewMode: "grid" | "list";
  sold: number;
  profitCents: number;
  isBestSeller: boolean;
  menuOpen: boolean;
  toggling: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onAnalytics: () => void;
  onDuplicate: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onToggleLive: () => void;
  onSoldOut: () => void;
  onFeatured: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const totalStock = getMerchItemTotalStock(item);

  return (
    <article
      className={`cursor-pointer overflow-hidden rounded-2xl border border-app-border/80 bg-[#161B22]/80 transition hover:border-sky-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.08)] ${
        viewMode === "list" ? "flex gap-4 p-3" : ""
      }`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
      role="button"
      tabIndex={0}
    >
      <div
        className={`relative ${viewMode === "list" ? "h-28 w-28 shrink-0 overflow-hidden rounded-xl" : ""}`}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className={
              viewMode === "grid"
                ? "aspect-[4/3] w-full object-cover"
                : "h-full w-full object-cover"
            }
          />
        ) : (
          <div
            className={`flex items-center justify-center bg-gradient-to-br from-[#1a1f2e] to-[#111827] text-app-muted ${
              viewMode === "grid" ? "aspect-[4/3] w-full" : "h-full w-full"
            }`}
          >
            Geen afbeelding
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <StatusBadge status={item.status} />
          {isBestSeller ? (
            <span className="rounded-md bg-violet-500 px-2 py-0.5 text-[10px] font-bold text-white">
              Best verkocht
            </span>
          ) : null}
        </div>
        {item.go_live_at ? (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
            <CalendarDays className="h-3 w-3" />
            {new Date(item.go_live_at).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "short",
            })}
          </span>
        ) : null}
      </div>

      <div className={`p-4 ${viewMode === "list" ? "min-w-0 flex-1 py-1" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold text-app-text">{item.title}</h2>
            <p className="mt-0.5 text-[14px] font-semibold text-app-text">
              {formatMerchPrice(item.price)}
            </p>
          </div>
          {profitCents > 0 ? (
            <p className="text-[12px] font-semibold text-emerald-400">
              Winst {formatMerchPrice(profitCents / 100)}
            </p>
          ) : null}
        </div>

        <p className="mt-1 text-[12px] font-medium text-emerald-400">
          {sold} verkocht
          {totalStock !== null ? ` · ${totalStock} op voorraad` : ""}
        </p>

        {item.sizes?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.sizes.slice(0, 6).map((size) => (
              <span
                key={size}
                className={`rounded-md px-2 py-0.5 text-[10px] ${
                  item.stock_by_size?.[size] === 0
                    ? "bg-red-500/10 text-red-300"
                    : "bg-app-surface-muted text-app-muted"
                }`}
              >
                {size}: {item.stock_by_size?.[size] ?? "∞"}
              </span>
            ))}
          </div>
        ) : null}

        <div
          className="mt-3 flex items-center gap-1 border-t border-app-border/60 pt-3"
          onClick={(event) => event.stopPropagation()}
        >
          <ActionBtn icon={Eye} label="Bekijken" onClick={onOpen} />
          <ActionBtn icon={Pencil} label="Bewerken" onClick={onEdit} />
          <ActionBtn icon={BarChart3} label="Analytics" onClick={onAnalytics} />
          <ActionBtn icon={Copy} label="Dupliceren" onClick={onDuplicate} />
          <div className="relative ml-auto">
            <ActionBtn icon={MoreHorizontal} label="Meer" onClick={onToggleMenu} />
            {menuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Menu sluiten"
                  onClick={onCloseMenu}
                />
                <div className="absolute bottom-full right-0 z-20 mb-1 min-w-[160px] overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-xl">
                  <MenuItem disabled={toggling} onClick={onToggleLive}>
                    {item.active ? "Naar concept" : "Live zetten"}
                  </MenuItem>
                  <MenuItem onClick={onSoldOut}>Uitverkocht zetten</MenuItem>
                  <MenuItem onClick={onFeatured}>
                    {item.featured ? "Featured uit" : "Featured maken"}
                  </MenuItem>
                  <MenuItem onClick={onArchive}>Archiveren</MenuItem>
                  <MenuItem onClick={onDelete} danger>
                    Verwijderen
                  </MenuItem>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg p-2 text-app-muted hover:bg-app-surface-muted hover:text-app-text"
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`block w-full px-3 py-2 text-left text-[12px] hover:bg-app-surface-muted disabled:opacity-50 ${
        danger ? "text-red-400" : "text-app-text"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: MerchItem["status"] }) {
  const tone =
    status === "live"
      ? "bg-emerald-500 text-white"
      : status === "soldout"
        ? "bg-red-500 text-white"
        : status === "archived"
          ? "bg-slate-500 text-white"
          : "bg-amber-500 text-white";
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      {getMerchStatusLabel(status)}
    </span>
  );
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
