"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Crown } from "lucide-react";
import { formatMerchPrice } from "@/lib/merch";
import {
  formatMerchFulfillmentStatus,
  formatMerchOrderStatus,
  updateMerchOrderFulfillmentStatus,
  type MerchFulfillmentStatus,
  type CoachMerchOrderRow,
} from "@/lib/merchOrders";
import type { MerchShopStats } from "@/lib/merchShopStats";

type MerchShopSidebarProps = {
  orders: CoachMerchOrderRow[];
  loading: boolean;
  stats: MerchShopStats;
  initials: (name: string) => string;
  onRefresh: () => Promise<void>;
  onToast: (message: string) => void;
};

function timeAgo(iso: string) {
  const parsed = new Date(iso);
  if (!iso || Number.isNaN(parsed.getTime())) return "onbekend";
  const diffMs = Date.now() - parsed.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "zojuist";
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.round(hours / 24);
  if (days === 1) return "1 dag geleden";
  if (days < 30) return `${days} dagen geleden`;
  const months = Math.round(days / 30);
  return months === 1 ? "1 maand geleden" : `${months} maanden geleden`;
}

function statusToneClass(status: CoachMerchOrderRow["status"]) {
  switch (status) {
    case "paid":
      return "bg-emerald-500/15 text-emerald-300";
    case "pending":
      return "bg-sky-500/15 text-sky-300";
    case "cancelled":
      return "bg-app-surface-hover text-app-muted";
    case "failed":
      return "bg-red-500/15 text-red-300";
    default:
      return "bg-app-surface-hover text-app-muted";
  }
}

export default function MerchShopSidebar({
  orders,
  loading,
  stats,
  initials,
  onRefresh,
  onToast,
}: MerchShopSidebarProps) {
  const recentOrders = orders.slice(0, 6);
  const chartData = stats.dailyRevenue.map((entry) => ({
    day: entry.day,
    euro: Math.round(entry.cents / 100),
  }));
  const hasRevenue = chartData.some((point) => point.euro > 0);

  async function handleFulfillmentChange(
    orderId: string,
    status: MerchFulfillmentStatus,
  ) {
    const { error } = await updateMerchOrderFulfillmentStatus(orderId, status);
    if (error) {
      onToast(error.message);
      return;
    }
    await onRefresh();
    onToast(`Orderstatus aangepast naar ${formatMerchFulfillmentStatus(status)}.`);
  }

  return (
    <aside className="flex flex-col gap-4">
      <section className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-app-text">
            Recente bestellingen
          </h2>
          <span className="text-[11px] text-app-subtle">
            {stats.orderCount} totaal
          </span>
        </div>

        {loading ? (
          <p className="py-6 text-center text-[12px] text-app-muted">Laden...</p>
        ) : recentOrders.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-app-muted">
            Nog geen bestellingen
          </p>
        ) : (
          <ul className="space-y-2.5">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-surface-muted text-[11px] font-semibold text-app-text">
                  {initials(order.athlete_name || "Atleet")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-app-text">
                    {order.athlete_name || "Atleet"}
                  </p>
                  <p className="truncate text-[11px] text-app-muted">
                    {order.item_title || "Product"}
                    {order.size ? ` (${order.size})` : ""} ·{" "}
                    {formatMerchPrice(order.amount_cents / 100)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusToneClass(
                      order.status,
                    )}`}
                  >
                    {formatMerchOrderStatus(order.status)}
                  </span>
                  <span className="text-[10px] text-app-subtle">
                    {timeAgo(order.created_at)}
                  </span>
                </div>
                <select
                  value={order.fulfillment_status}
                  onChange={(event) =>
                    void handleFulfillmentChange(
                      order.id,
                      event.target.value as MerchFulfillmentStatus,
                    )
                  }
                  className="ml-1 w-[118px] rounded-lg border border-app-border bg-app-surface px-2 py-1 text-[10px] text-app-text"
                >
                  <option value="new">Nieuw</option>
                  <option value="processing">In behandeling</option>
                  <option value="shipped">Verzonden</option>
                  <option value="delivered">Afgeleverd</option>
                  <option value="cancelled">Geannuleerd</option>
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      {stats.bestSeller ? (
        <section className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4">
          <h2 className="mb-3 text-[14px] font-semibold text-app-text">
            Best verkopend product
          </h2>
          <div className="flex items-center gap-3">
            {stats.bestSeller.imageUrl ? (
              <img
                src={stats.bestSeller.imageUrl}
                alt={stats.bestSeller.title}
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-app-surface-muted text-[10px] text-app-muted">
                —
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-app-text">
                {stats.bestSeller.title}
              </p>
              <p className="text-[11px] text-app-muted">
                {stats.bestSeller.sold} verkocht ·{" "}
                {formatMerchPrice(stats.bestSeller.revenueCents / 100)} omzet
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-app-text">
            Omzet deze maand
          </h2>
          <span className="text-[13px] font-semibold text-app-accent">
            {formatMerchPrice(stats.monthlyRevenueCents / 100)}
          </span>
        </div>
        {hasRevenue ? (
          <div className="h-[130px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 6, bottom: 0, left: -22 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.12)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "rgba(148,163,184,0.7)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={18}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(148,163,184,0.7)" }}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f141b",
                    border: "1px solid rgba(148,163,184,0.2)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelFormatter={(label) => `Dag ${label}`}
                  formatter={(value) => [
                    formatMerchPrice(Number(value)),
                    "Omzet",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="euro"
                  stroke="#4f8cff"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-[12px] text-app-muted">
            Nog geen omzet deze maand
          </p>
        )}
      </section>

      {stats.topBuyer ? (
        <section className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4">
          <h2 className="mb-3 text-[14px] font-semibold text-app-text">
            Top koper deze maand
          </h2>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
              <Crown className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-app-text">
                {stats.topBuyer.name}
              </p>
              <p className="text-[11px] text-app-muted">
                {formatMerchPrice(stats.topBuyer.totalCents / 100)} besteed
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </aside>
  );
}
