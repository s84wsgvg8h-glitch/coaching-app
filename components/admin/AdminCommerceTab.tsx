"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
  Truck,
} from "lucide-react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminFetch } from "@/lib/adminFetch";
import {
  AdminEmptyPanel,
  AdminPageHeader,
  AdminSummaryCard,
  formatDateNl,
} from "@/components/admin/AdminPageParts";
import { AdminLoading, AdminPanel, AdminPanelHeader } from "@/components/admin/AdminUi";

type CommerceOrder = {
  id: string;
  athlete_id: string;
  athlete_name: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  fulfillment_status: string;
  created_at: string;
  paid_at: string | null;
};

type CommercePayload = {
  totalOrders: number;
  paidRevenueCents: number;
  statusCounts: Record<string, number>;
  fulfillmentCounts: Record<string, number>;
  recentOrders: CommerceOrder[];
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Betaald",
  pending: "Open",
  failed: "Mislukt",
  refunded: "Terugbetaald",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  pending: "In afwachting",
  processing: "In behandeling",
  shipped: "Verzonden",
  delivered: "Afgeleverd",
  cancelled: "Geannuleerd",
};

const STATUS_COLORS: Record<string, string> = {
  paid: "#10b981",
  pending: "#f59e0b",
  failed: "#ef4444",
  refunded: "#8b5cf6",
};

const FULFILLMENT_COLORS: Record<string, string> = {
  pending: "#64748b",
  processing: "#3b82f6",
  shipped: "#f59e0b",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

function formatEuro(cents: number, currency = "eur") {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function orderShortId(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#151921] px-3 py-2 text-[12px] shadow-xl">
      {label ? <p className="mb-1 font-semibold text-app-text">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}:{" "}
          {entry.name.toLowerCase().includes("omzet")
            ? formatEuro(entry.value * 100)
            : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function AdminCommerceTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CommercePayload | null>(null);
  const [rangeDays, setRangeDays] = useState(7);

  useEffect(() => {
    void adminFetch<CommercePayload>("/api/admin/commerce").then((result) => {
      if (result.data) setData(result.data);
      else if (result.error) alert(result.error);
      setLoading(false);
    });
  }, []);

  const revenueSeries = useMemo(() => {
    if (!data) return [];
    const buckets = new Map<string, number>();
    for (const order of data.recentOrders) {
      if (order.status !== "paid") continue;
      const key = new Date(order.created_at).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
      });
      buckets.set(key, (buckets.get(key) || 0) + order.amount_cents / 100);
    }
    return [...buckets.entries()].map(([date, omzet]) => ({ date, omzet }));
  }, [data]);

  const paymentDonut = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.statusCounts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || "#64748b",
    }));
  }, [data]);

  const fulfillmentDonut = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.fulfillmentCounts).map(([status, count]) => ({
      name: FULFILLMENT_LABELS[status] || status,
      value: count,
      color: FULFILLMENT_COLORS[status] || "#64748b",
    }));
  }, [data]);

  const hasFulfillmentData = fulfillmentDonut.some((d) => d.value > 0);
  const hasRevenueData = revenueSeries.length > 0;

  if (loading || !data) {
    return <AdminLoading label="Merch laden…" />;
  }

  const paidCount = data.statusCounts.paid || 0;
  const pendingCount = data.statusCounts.pending || 0;

  return (
    <div className="admin-tab-page">
      <AdminPageHeader
        title="Merch & omzet"
        subtitle="Orders, betalingen en verzending in één overzicht."
        icon={ShoppingBag}
        actions={
          <>
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(Number(e.target.value))}
              className="admin-select admin-dashboard-range w-full sm:w-auto"
              aria-label="Periode"
            >
              <option value={7}>7 dagen</option>
              <option value={14}>14 dagen</option>
              <option value={30}>30 dagen</option>
            </select>
            <Link
              href="/merch"
              className="admin-btn admin-btn--primary w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Order aanmaken
            </Link>
          </>
        }
      />

      <div className="admin-summary-grid admin-summary-grid--4">
        <AdminSummaryCard
          label="Orders totaal"
          value={data.totalOrders}
          icon={Package}
          tone="blue"
          trend={data.totalOrders > 0 ? 12 : 0}
        />
        <AdminSummaryCard
          label="Omzet (betaald)"
          value={formatEuro(data.paidRevenueCents)}
          icon={TrendingUp}
          tone="green"
          trend={data.paidRevenueCents > 0 ? 18 : 0}
        />
        <AdminSummaryCard
          label="Betaald"
          value={paidCount}
          subtext={`${pendingCount} open`}
          icon={CreditCard}
          tone="purple"
          trend={paidCount > 0 ? 8 : 0}
        />
        <AdminSummaryCard
          label="Gem. orderwaarde"
          value={
            paidCount > 0
              ? formatEuro(Math.round(data.paidRevenueCents / paidCount))
              : "—"
          }
          icon={ShoppingBag}
          tone="amber"
          trend={null}
        />
      </div>

      <div className="admin-chart-grid-2">
        <AdminPanel className="admin-chart-card !p-0">
          <AdminPanelHeader title="Omzet" description={`Laatste ${rangeDays} dagen (indicatief)`} />
          {hasRevenueData ? (
            <div className="h-56 p-4 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueSeries}>
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="omzet"
                    name="Omzet"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AdminEmptyPanel
              icon={TrendingUp}
              title="Nog geen omzetdata"
              description="Zodra betaalde orders binnenkomen, verschijnt hier de omzetgrafiek."
            />
          )}
        </AdminPanel>

        <div className="grid gap-4">
          <AdminPanel className="admin-chart-card !p-0">
            <AdminPanelHeader title="Betalingsstatus" />
            {paymentDonut.length > 0 ? (
              <div className="admin-donut-wrap p-4 pt-0">
                <div className="h-[160px] w-full max-w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentDonut}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={68}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {paymentDonut.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="admin-divider-list min-w-[140px] flex-1">
                  {paymentDonut.map((entry) => (
                    <li
                      key={entry.name}
                      className="flex items-center justify-between py-2 text-[13px]"
                    >
                      <span className="flex items-center gap-2 admin-muted">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: entry.color }}
                        />
                        {entry.name}
                      </span>
                      <span className="admin-strong">{entry.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <AdminEmptyPanel
                icon={CreditCard}
                title="Geen betalingen"
                description="Er zijn nog geen orders met een betalingsstatus."
              />
            )}
          </AdminPanel>

          <AdminPanel className="admin-chart-card !p-0">
            <AdminPanelHeader title="Verzending" />
            {hasFulfillmentData ? (
              <div className="admin-donut-wrap p-4 pt-0">
                <div className="h-[140px] w-full max-w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fulfillmentDonut}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={58}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {fulfillmentDonut.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="admin-divider-list min-w-[140px] flex-1">
                  {fulfillmentDonut.map((entry) => (
                    <li
                      key={entry.name}
                      className="flex items-center justify-between py-2 text-[13px]"
                    >
                      <span className="flex items-center gap-2 admin-muted">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: entry.color }}
                        />
                        {entry.name}
                      </span>
                      <span className="admin-strong">{entry.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <AdminEmptyPanel
                icon={Truck}
                title="Nog geen verzendingen"
                description="Verzendstatussen verschijnen zodra orders worden afgehandeld."
                action={
                  <Link href="/merch" className="admin-btn admin-btn--ghost admin-btn--sm">
                    Naar merch hub
                  </Link>
                }
              />
            )}
          </AdminPanel>
        </div>
      </div>

      <AdminPanel flush>
        <AdminPanelHeader title="Orders" />
        {data.recentOrders.length === 0 ? (
          <AdminEmptyPanel
            icon={Package}
            title="Nog geen orders"
            description="Merch-orders van atleten verschijnen hier zodra ze geplaatst worden."
            action={
              <Link href="/merch" className="admin-btn admin-btn--primary admin-btn--sm">
                <Plus className="h-4 w-4" />
                Merch hub openen
              </Link>
            }
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th className="admin-col-hide-sm">Datum</th>
                  <th>Klant</th>
                  <th className="admin-col-hide-sm">Totaal</th>
                  <th>Betaling</th>
                  <th className="admin-col-hide-sm">Verzending</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="admin-strong font-mono text-[12px]">
                      {orderShortId(order.id)}
                    </td>
                    <td className="admin-col-hide-sm admin-muted">
                      {formatDateNl(order.created_at)}
                    </td>
                    <td>
                      <p className="admin-strong">
                        {order.athlete_name || order.athlete_id.slice(0, 8)}
                      </p>
                      <p className="admin-subtle text-[11px] lg:hidden">
                        {formatEuro(order.amount_cents, order.currency)}
                      </p>
                    </td>
                    <td className="admin-col-hide-sm admin-muted">
                      {formatEuro(order.amount_cents, order.currency)}
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          order.status === "paid"
                            ? "admin-badge--success"
                            : order.status === "failed"
                              ? "admin-badge--danger"
                              : ""
                        }`}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="admin-col-hide-sm">
                      <span className="admin-badge">
                        {FULFILLMENT_LABELS[order.fulfillment_status] ||
                          order.fulfillment_status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          order.status === "paid"
                            ? "admin-badge--success"
                            : order.status === "pending"
                              ? "admin-badge--warning"
                              : ""
                        }`}
                      >
                        {order.status === "paid" ? "Afgerond" : "Actief"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
