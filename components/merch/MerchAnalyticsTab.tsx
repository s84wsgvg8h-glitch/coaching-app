"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import MerchMetricCard from "@/components/merch/MerchMetricCard";
import EmptyState from "@/components/ui/EmptyState";
import { formatMerchPrice, getMerchLowStockLabel, type MerchItem } from "@/lib/merch";
import type { CoachMerchOrderRow } from "@/lib/merchOrders";
import {
  buildMerchMonthlySeries,
  buildMerchProductPerformance,
  buildMerchShopStats,
  buildMerchSizeBreakdown,
} from "@/lib/merchShopStats";
import { Crown, Package, TrendingUp, Users } from "lucide-react";

type MerchAnalyticsTabProps = {
  items: MerchItem[];
  orders: CoachMerchOrderRow[];
  athleteCount: number;
};

export default function MerchAnalyticsTab({
  items,
  orders,
  athleteCount,
}: MerchAnalyticsTabProps) {
  const stats = useMemo(
    () => buildMerchShopStats(items, orders, athleteCount),
    [items, orders, athleteCount],
  );

  const monthly = useMemo(
    () => buildMerchMonthlySeries(orders, items),
    [orders, items],
  );
  const sizeBreakdown = useMemo(() => buildMerchSizeBreakdown(orders), [orders]);
  const performance = useMemo(
    () => buildMerchProductPerformance(items, stats, athleteCount),
    [items, stats, athleteCount],
  );

  const lowStockItems = useMemo(
    () =>
      items
        .map((item) => ({ item, label: getMerchLowStockLabel(item) }))
        .filter((entry) => entry.label)
        .slice(0, 6),
    [items],
  );

  const preorderItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.preorder &&
          item.status !== "archived" &&
          item.preorder_target &&
          item.preorder_target > 0,
      ),
    [items],
  );

  const noSalesItems = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.status === "live" && (stats.salesByItemId[item.id] || 0) === 0,
        )
        .slice(0, 5),
    [items, stats.salesByItemId],
  );

  const hasData =
    stats.orderCount > 0 ||
    stats.monthlyRevenueCents > 0 ||
    performance.length > 0;

  const revenueChart = monthly.map((point) => ({
    label: point.label,
    omzet: Math.round(point.revenueCents / 100),
    winst: Math.round(point.profitCents / 100),
    orders: point.orders,
  }));

  const sizeChart = sizeBreakdown.slice(0, 8);

  if (!hasData) {
    return (
      <>
        <header className="mb-5">
          <h1 className="text-[28px] font-bold tracking-tight text-app-text">
            Analytics
          </h1>
          <p className="mt-1 text-[14px] text-app-muted">
            Inzicht in omzet, orders en productprestaties.
          </p>
        </header>
        <EmptyState
          title="Nog geen analytics data"
          description="Zodra je eerste bestellingen binnenkomen, zie je hier trends en prestaties."
        />
      </>
    );
  }

  return (
    <>
      <header className="mb-5">
        <h1 className="text-[28px] font-bold tracking-tight text-app-text">
          Analytics
        </h1>
        <p className="mt-1 text-[14px] text-app-muted">
          Inzicht in omzet, orders en productprestaties.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MerchMetricCard
          label="Omzet deze maand"
          value={formatMerchPrice(stats.monthlyRevenueCents / 100)}
          icon={TrendingUp}
          tone="text-sky-400"
          bg="bg-sky-500/10"
        />
        <MerchMetricCard
          label="Winst deze maand"
          value={formatMerchPrice(stats.monthlyProfitCents / 100)}
          icon={TrendingUp}
          tone="text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <MerchMetricCard
          label="Orders deze maand"
          value={
            monthly[monthly.length - 1]?.orders ?? stats.orderCount
          }
          icon={Users}
          tone="text-violet-400"
          bg="bg-violet-500/10"
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

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Omzet & winst per maand">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#11161D",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="omzet"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="winst"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Meest gekozen maten">
          {sizeChart.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-app-muted">
              Nog geen maatdata
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sizeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="size" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#11161D",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-app-muted">
            Product performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead className="text-app-subtle">
                <tr>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Verkocht</th>
                  <th className="pb-2 font-medium">Omzet</th>
                  <th className="pb-2 font-medium">Winst</th>
                </tr>
              </thead>
              <tbody>
                {performance.slice(0, 10).map((row) => (
                  <tr key={row.itemId} className="border-t border-app-border/50">
                    <td className="py-2.5 font-medium text-app-text">{row.title}</td>
                    <td className="py-2.5 text-app-muted">{row.sold}</td>
                    <td className="py-2.5 text-app-muted">
                      {formatMerchPrice(row.revenueCents / 100)}
                    </td>
                    <td className="py-2.5 text-emerald-400">
                      {formatMerchPrice(row.profitCents / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          {stats.bestSeller ? (
            <div className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-app-muted">
                Best verkocht
              </h3>
              <p className="mt-2 text-[15px] font-semibold text-app-text">
                {stats.bestSeller.title}
              </p>
              <p className="text-[12px] text-app-muted">
                {stats.bestSeller.sold} verkocht ·{" "}
                {formatMerchPrice(stats.bestSeller.revenueCents / 100)}
              </p>
            </div>
          ) : null}

          {stats.topBuyer ? (
            <div className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-app-muted">
                  Top koper
                </h3>
              </div>
              <p className="mt-2 text-[15px] font-semibold text-app-text">
                {stats.topBuyer.name}
              </p>
              <p className="text-[12px] text-app-muted">
                {formatMerchPrice(stats.topBuyer.totalCents / 100)} totaal
              </p>
            </div>
          ) : null}

          {lowStockItems.length > 0 ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-400" />
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-amber-300/90">
                  Lage voorraad
                </h3>
              </div>
              <ul className="mt-3 space-y-2">
                {lowStockItems.map(({ item, label }) => (
                  <li key={item.id} className="text-[12px] text-app-text">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-app-muted"> · {label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preorderItems.length > 0 ? (
            <div className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-app-muted">
                Pre-order voortgang
              </h3>
              <ul className="mt-3 space-y-2">
                {preorderItems.map((item) => {
                  const sold = stats.salesByItemId[item.id] || 0;
                  const target = item.preorder_target || 0;
                  const pct = Math.min(100, Math.round((sold / target) * 100));
                  return (
                    <li key={item.id}>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium text-app-text">{item.title}</span>
                        <span className="text-app-muted">
                          {sold}/{target}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-app-surface-muted">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {noSalesItems.length > 0 ? (
            <div className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-app-muted">
                Geen verkopen (live)
              </h3>
              <ul className="mt-3 space-y-1.5 text-[12px] text-app-muted">
                {noSalesItems.map((item) => (
                  <li key={item.id}>{item.title}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-app-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
