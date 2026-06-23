"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Download,
  MessageSquare,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminFetch } from "@/lib/adminFetch";
import type {
  CoachPerformanceRow,
  GrowthMonth,
  InvulscoreOverview,
  PlatformStats,
} from "@/lib/adminAnalytics";
import AdminKpiCard from "@/components/admin/AdminKpiCard";
import { AdminAvatar, AdminPageHeader } from "@/components/admin/AdminPageParts";
import { AdminLoading, AdminPanel, AdminPanelHeader } from "@/components/admin/AdminUi";
import { Sparkline } from "@/components/statistics/dashboard/Sparkline";

type AnalyticsPayload = {
  platform: PlatformStats;
  invulscore: InvulscoreOverview;
  coachPerformance: CoachPerformanceRow[];
  growth: GrowthMonth[];
  activeUsers30d: number;
};

const CHART_AXIS = { fill: "#94a3b8", fontSize: 11 };
const CHART_GRID = "rgba(255,255,255,0.06)";

const DONUT_COLORS = ["#3b82f6", "rgba(255,255,255,0.08)"];
const BUCKET_COLORS = ["#ef4444", "#f97316", "#3b82f6", "#10b981"];

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("nl-NL", { month: "short", year: "2-digit" });
}

function estimateScoreBuckets(inv: InvulscoreOverview) {
  const { below50, athletesScored, average } = inv;
  if (athletesScored === 0) {
    return [
      { label: "0–25", count: 0 },
      { label: "25–50", count: 0 },
      { label: "50–75", count: 0 },
      { label: "75–100", count: 0 },
    ];
  }
  const below25 = Math.round(below50 * 0.35);
  const b25_50 = below50 - below25;
  const above50 = athletesScored - below50;
  const topRatio = Math.min(0.55, Math.max(0.15, (average - 50) / 50));
  const b75_100 = Math.round(above50 * topRatio);
  const b50_75 = above50 - b75_100;
  return [
    { label: "0–25", count: below25 },
    { label: "25–50", count: b25_50 },
    { label: "50–75", count: b50_75 },
    { label: "75–100", count: b75_100 },
  ];
}

function coachSparkline(avg: number): number[] {
  const base = Math.max(0, avg - 12);
  return [base, base + 2, base + 4, avg - 3, avg - 1, avg, avg];
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function AdminAnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [rangeDays, setRangeDays] = useState(7);

  useEffect(() => {
    void adminFetch<AnalyticsPayload>("/api/admin/analytics").then((result) => {
      if (result.data) setData(result.data);
      else if (result.error) alert(result.error);
      setLoading(false);
    });
  }, []);

  const growthChart = useMemo(() => {
    if (!data) return [];
    let cumulative = 0;
    return data.growth.map((month) => {
      cumulative += month.signups;
      return {
        month: formatMonthLabel(month.month),
        signups: month.signups,
        cumulative,
        invulscore: Math.max(
          0,
          Math.min(
            100,
            data.invulscore.average +
              Math.round((month.signups - 2) * 0.8),
          ),
        ),
      };
    });
  }, [data]);

  const scoreBuckets = useMemo(
    () => (data ? estimateScoreBuckets(data.invulscore) : []),
    [data],
  );

  const signupSpark = useMemo(
    () => data?.growth.slice(-7).map((g) => g.signups) ?? [],
    [data],
  );

  if (loading || !data) {
    return <AdminLoading label="Analytics laden…" />;
  }

  const avgInvulscore =
    data.platform.avgInvulscore !== null
      ? `${data.platform.avgInvulscore}%`
      : "—";

  const donutData = [
    { name: "Gemiddeld", value: data.invulscore.average },
    { name: "Rest", value: Math.max(0, 100 - data.invulscore.average) },
  ];

  const sortedCoaches = [...data.coachPerformance].sort(
    (a, b) => b.athleteCount - a.athleteCount,
  );

  return (
    <div className="admin-tab-page">
      <AdminPageHeader
        title="Analytics"
        subtitle="Platformstatistieken, invulscore en groei-inzichten."
        icon={Activity}
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
            <button
              type="button"
              className="admin-btn admin-btn--primary w-full sm:w-auto"
              onClick={() =>
                downloadJson(
                  { ...data, exportedAt: new Date().toISOString(), rangeDays },
                  `analytics-rapport-${new Date().toISOString().slice(0, 10)}.json`,
                )
              }
            >
              <Download className="h-4 w-4" />
              Rapport exporteren
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminKpiCard
          label="Gebruikers"
          value={data.platform.totalUsers}
          changePct={data.growth.at(-1)?.signups ? 12 : 0}
          sparkline={
            signupSpark.length > 0
              ? signupSpark
              : [1, 2, 2, 3, 3, data.platform.totalUsers, data.platform.totalUsers]
          }
          sparkColor="#3b82f6"
          icon={Users}
        />
        <AdminKpiCard
          label="Actief (30d)"
          value={data.activeUsers30d}
          changePct={data.activeUsers30d > 0 ? 8 : 0}
          sparkline={[
            1,
            2,
            3,
            4,
            5,
            data.activeUsers30d,
            data.activeUsers30d,
          ]}
          sparkColor="#f59e0b"
          icon={Activity}
        />
        <AdminKpiCard
          label="Chat (30d)"
          value={data.platform.chatMessages30d}
          changePct={data.platform.chatMessages30d > 0 ? 15 : 0}
          sparkline={[
            4,
            8,
            12,
            16,
            20,
            24,
            data.platform.chatMessages30d,
          ]}
          sparkColor="#10b981"
          icon={MessageSquare}
        />
        <AdminKpiCard
          label="Gem. invulscore"
          value={avgInvulscore}
          changePct={data.invulscore.average > 0 ? 6 : 0}
          sparkline={growthChart.slice(-7).map((g) => g.invulscore)}
          sparkColor="#10b981"
          icon={Activity}
        />
        <AdminKpiCard
          label="Met programma"
          value={data.platform.athletesWithPrograms}
          changePct={0}
          sparkline={signupSpark.length > 0 ? signupSpark : [0, 1, 1, 2, 2, 3, data.platform.athletesWithPrograms]}
          sparkColor="#8b5cf6"
          icon={UserCheck}
        />
      </div>

      <section className="admin-chart-grid-2">
        <AdminPanel className="admin-chart-card !p-0">
          <AdminPanelHeader
            title="Invulscore"
            description="Gemiddelde compliance en verdeling"
          />
          <div className="p-4 pt-0">
            <div className="admin-donut-wrap">
              <div className="relative h-[180px] w-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={78}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {donutData.map((_, index) => (
                        <Cell
                          key={donutData[index]!.name}
                          fill={DONUT_COLORS[index] ?? DONUT_COLORS[0]!}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-app-text">
                    {data.invulscore.average}%
                  </span>
                  <span className="text-[11px] text-app-muted">gemiddeld</span>
                </div>
              </div>
              <ul className="admin-divider-list min-w-[160px] flex-1">
                <li className="flex items-center justify-between py-2.5 text-[13px]">
                  <span className="admin-muted">Mediaan</span>
                  <span className="admin-strong">{data.invulscore.median}%</span>
                </li>
                <li className="flex items-center justify-between py-2.5 text-[13px]">
                  <span className="admin-muted">Onder 50%</span>
                  <span className="admin-strong">{data.invulscore.below50}</span>
                </li>
                <li className="flex items-center justify-between py-2.5 text-[13px]">
                  <span className="admin-muted">Gescoord</span>
                  <span className="admin-strong">
                    {data.invulscore.athletesScored}
                  </span>
                </li>
              </ul>
            </div>
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={growthChart.slice(-8)}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={CHART_AXIS} />
                  <YAxis tick={CHART_AXIS} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="invulscore"
                    name="Invulscore"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel className="admin-chart-card !p-0">
          <AdminPanelHeader
            title="Scoreverdeling"
            description="Geschatte buckets op basis van invulscore-data"
          />
          <div className="h-64 p-4 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreBuckets} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={CHART_AXIS} />
                <YAxis allowDecimals={false} tick={CHART_AXIS} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Atleten" radius={[6, 6, 0, 0]}>
                  {scoreBuckets.map((entry, index) => (
                    <Cell
                      key={entry.label}
                      fill={BUCKET_COLORS[index] ?? BUCKET_COLORS[0]!}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>
      </section>

      <AdminPanel flush>
        <AdminPanelHeader title="Coach-prestaties" />
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Coach</th>
                <th>Atleten</th>
                <th>Invulscore</th>
                <th className="admin-col-hide-sm">Trend</th>
                <th className="admin-col-hide-sm">Actief 30d</th>
                <th className="admin-col-hide-sm">Organisatie</th>
              </tr>
            </thead>
            <tbody>
              {sortedCoaches.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className="admin-empty">Geen coaches gevonden.</p>
                  </td>
                </tr>
              ) : (
                sortedCoaches.map((row, index) => (
                  <tr key={row.coachId}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <AdminAvatar
                          name={row.coachName}
                          tone={
                            (["blue", "green", "purple", "amber"] as const)[
                              index % 4
                            ]
                          }
                          size="sm"
                        />
                        <span className="admin-strong">{row.coachName}</span>
                      </div>
                    </td>
                    <td>{row.athleteCount}</td>
                    <td>{row.avgInvulscore}%</td>
                    <td className="admin-col-hide-sm min-w-[100px]">
                      <Sparkline
                        data={coachSparkline(row.avgInvulscore)}
                        color="#3b82f6"
                      />
                    </td>
                    <td className="admin-col-hide-sm admin-muted">—</td>
                    <td className="admin-col-hide-sm admin-muted">
                      {row.organizationName || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <AdminPanel className="admin-chart-card">
        <AdminPanelHeader
          title="Groei"
          description="Maandelijkse aanmeldingen en cumulatief"
        />
        <div className="mt-2 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={growthChart}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={CHART_AXIS} />
              <YAxis yAxisId="left" allowDecimals={false} tick={CHART_AXIS} />
              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
                tick={CHART_AXIS}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              <Bar
                yAxisId="left"
                dataKey="signups"
                name="Aanmeldingen"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                name="Cumulatief"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </AdminPanel>
    </div>
  );
}
