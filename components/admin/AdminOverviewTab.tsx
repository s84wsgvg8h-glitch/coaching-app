"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Link2,
  MessageSquare,
  Plus,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";
import type { PlatformStats } from "@/lib/adminAnalytics";
import { loadAdminInviteOverview } from "@/lib/adminInvites";
import AdminKpiCard from "@/components/admin/AdminKpiCard";
import { AdminLoading, AdminRoleBadge } from "@/components/admin/AdminUi";
import type { AdminUser } from "@/components/admin/AdminUsersTab";

type OverviewPayload = {
  platform: PlatformStats;
  activeUsers30d: number;
};

type HealthPayload = {
  checks: {
    supabaseConfigured: boolean;
    serviceRolePresent: boolean;
    cronSecretPresent: boolean;
  };
};

type AdminOverviewTabProps = {
  users: AdminUser[];
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return startOfDay(d);
}

function countInRange(
  users: AdminUser[],
  role: string | null,
  from: Date,
  to: Date,
) {
  return users.filter((user) => {
    if (role && user.role !== role) return false;
    if (!user.created_at) return false;
    const created = new Date(user.created_at);
    return created >= from && created < to;
  }).length;
}

function dailySeries(
  users: AdminUser[],
  role: string | null,
  days = 7,
): number[] {
  const series: number[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = daysAgo(i);
    const dayEnd = daysAgo(i - 1);
    series.push(countInRange(users, role, dayStart, dayEnd));
  }
  return series;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return "Onbekend";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} dag${days === 1 ? "" : "en"} geleden`;
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

function getInitials(name: string | null) {
  const parts = (name || "??").split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

const AVATAR_COLORS = [
  "admin-avatar--blue",
  "admin-avatar--green",
  "admin-avatar--purple",
  "admin-avatar--amber",
];

export default function AdminOverviewTab({ users }: AdminOverviewTabProps) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<OverviewPayload | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [inactiveInvites, setInactiveInvites] = useState(0);
  const [rangeDays, setRangeDays] = useState(7);

  const counts = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        const role = user.role || "onbekend";
        acc[role] = (acc[role] || 0) + 1;
        acc.total += 1;
        return acc;
      },
      { total: 0 } as Record<string, number>,
    );
  }, [users]);

  const periodStart = useMemo(() => daysAgo(rangeDays), [rangeDays]);
  const prevPeriodStart = useMemo(
    () => daysAgo(rangeDays * 2),
    [rangeDays],
  );

  const trends = useMemo(() => {
    const currentTotal = countInRange(users, null, periodStart, new Date());
    const prevTotal = countInRange(users, null, prevPeriodStart, periodStart);
    const currentCoaches = countInRange(users, "coach", periodStart, new Date());
    const prevCoaches = countInRange(users, "coach", prevPeriodStart, periodStart);
    const currentAthletes = countInRange(users, "atleet", periodStart, new Date());
    const prevAthletes = countInRange(users, "atleet", prevPeriodStart, periodStart);

    return {
      users: {
        change: pctChange(currentTotal, prevTotal),
        spark: dailySeries(users, null, 7),
      },
      coaches: {
        change: pctChange(currentCoaches, prevCoaches),
        spark: dailySeries(users, "coach", 7),
      },
      athletes: {
        change: pctChange(currentAthletes, prevAthletes),
        spark: dailySeries(users, "atleet", 7),
      },
    };
  }, [users, periodStart, prevPeriodStart]);

  const pendingCoaches = useMemo(
    () =>
      users.filter(
        (user) => user.role === "pending" && user.pending_kind === "coach",
      ).length,
    [users],
  );

  const pendingAthletes = useMemo(
    () =>
      users.filter(
        (user) =>
          user.role === "pending" &&
          (user.pending_kind === "athlete" || !user.pending_kind),
      ).length,
    [users],
  );

  const unassignedAthletes = useMemo(
    () => users.filter((user) => user.role === "atleet" && !user.coach_id).length,
    [users],
  );

  const recentUsers = useMemo(
    () =>
      [...users]
        .filter((user) => user.created_at)
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime(),
        )
        .slice(0, 6),
    [users],
  );

  const todayStart = useMemo(() => startOfDay(new Date()), []);

  const todayStats = useMemo(() => {
    const isToday = (date: string | null) => {
      if (!date) return false;
      return new Date(date) >= todayStart;
    };

    return {
      newUsers: users.filter((u) => isToday(u.created_at)).length,
      newCoaches: users.filter(
        (u) => u.role === "coach" && isToday(u.created_at),
      ).length,
      chatMessages: analytics?.platform.chatMessages30d
        ? Math.round(analytics.platform.chatMessages30d / 30)
        : 0,
    };
  }, [users, todayStart, analytics]);

  const actionItems = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      href: string;
      action: string;
      tone: "warning" | "danger" | "default";
    }> = [];

    if (pendingCoaches > 0) {
      items.push({
        id: "coaches",
        label: `${pendingCoaches} coach${pendingCoaches === 1 ? "" : "s"} wacht${pendingCoaches === 1 ? "" : "en"} op goedkeuring`,
        href: "/admin?tab=coaches",
        action: "Goedkeuren",
        tone: "warning",
      });
    }

    if (pendingAthletes > 0) {
      items.push({
        id: "pending-athletes",
        label: `${pendingAthletes} atleet${pendingAthletes === 1 ? "" : "en"} wacht${pendingAthletes === 1 ? "" : "en"} op goedkeuring`,
        href: "/admin?tab=users&status=pending",
        action: "Goedkeuren",
        tone: "warning",
      });
    }

    if (inactiveInvites > 0) {
      items.push({
        id: "invites",
        label: `${inactiveInvites} inactieve uitnodigingslink${inactiveInvites === 1 ? "" : "s"}`,
        href: "/admin?tab=invites",
        action: "Bekijken",
        tone: "default",
      });
    }

    if (unassignedAthletes > 0) {
      items.push({
        id: "athletes",
        label: `${unassignedAthletes} atleet${unassignedAthletes === 1 ? "" : "en"} zonder coach`,
        href: "/admin?tab=users",
        action: "Koppelen",
        tone: "warning",
      });
    }

    if (health && !health.checks.cronSecretPresent) {
      items.push({
        id: "cron",
        label: "Systeemsecret is verlopen",
        href: "/admin?tab=system",
        action: "Herstellen",
        tone: "danger",
      });
    }

    return items;
  }, [
    pendingCoaches,
    pendingAthletes,
    inactiveInvites,
    unassignedAthletes,
    health,
  ]);

  const healthOk = useMemo(() => {
    if (!health) return false;
    return (
      health.checks.supabaseConfigured &&
      health.checks.serviceRolePresent &&
      health.checks.cronSecretPresent
    );
  }, [health]);

  useEffect(() => {
    void Promise.all([
      adminFetch<OverviewPayload>("/api/admin/analytics"),
      adminFetch<HealthPayload>("/api/admin/health"),
      loadAdminInviteOverview(),
    ]).then(([analyticsResult, healthResult, invites]) => {
      if (analyticsResult.data) setAnalytics(analyticsResult.data);
      if (healthResult.data) setHealth(healthResult.data);

      const inactive =
        invites.athleteInvites.filter((i) => !i.active).length +
        invites.coachSignupInvites.filter((i) => !i.active).length;
      setInactiveInvites(inactive);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <AdminLoading label="Dashboard laden…" />;
  }

  const platform = analytics?.platform;
  const avgInvulscore =
    platform?.avgInvulscore !== null && platform?.avgInvulscore !== undefined
      ? `${platform.avgInvulscore}%`
      : "—";

  const quickActions = [
    {
      label: "Coach aanmaken",
      href: "/admin/create-coach",
      icon: UserPlus,
    },
    {
      label: "Uitnodigingslink",
      href: "/admin?tab=invites",
      icon: Link2,
    },
    {
      label: "Organisatie aanmaken",
      href: "/admin?tab=organizations",
      icon: Building2,
    },
    {
      label: "Gebruikers beheren",
      href: "/admin?tab=users",
      icon: Users,
    },
    {
      label: "Analytics openen",
      href: "/admin?tab=analytics",
      icon: BarChart3,
    },
    {
      label: "Kennisbank",
      href: "/admin?tab=kennisbank",
      icon: BookOpen,
    },
    {
      label: "Demo modus",
      href: "/admin?tab=system",
      icon: Sparkles,
    },
  ];

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div className="min-w-0">
          <h1 className="admin-dashboard-title">Dashboard</h1>
          <p className="admin-dashboard-subtitle">
            Overzicht van je platformprestaties en belangrijke activiteiten.
          </p>
        </div>
        <div className="admin-dashboard-header-actions">
          <select
            value={rangeDays}
            onChange={(event) => setRangeDays(Number(event.target.value))}
            className="admin-select admin-dashboard-range"
            aria-label="Periode"
          >
            <option value={7}>7 dagen</option>
            <option value={14}>14 dagen</option>
            <option value={30}>30 dagen</option>
          </select>
          <Link
            href="/admin/create-coach"
            className="admin-btn admin-btn--primary w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Coach aanmaken
          </Link>
        </div>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard
          label="Gebruikers"
          value={counts.total}
          changePct={trends.users.change}
          sparkline={trends.users.spark}
          sparkColor="#3b82f6"
          icon={Users}
        />
        <AdminKpiCard
          label="Coaches"
          value={counts.coach || 0}
          changePct={trends.coaches.change}
          sparkline={trends.coaches.spark}
          sparkColor="#10b981"
          icon={UserCheck}
        />
        <AdminKpiCard
          label="Atleten"
          value={counts.atleet || 0}
          changePct={trends.athletes.change}
          sparkline={trends.athletes.spark}
          sparkColor="#8b5cf6"
          icon={Users}
        />
        <AdminKpiCard
          label="Actief (30d)"
          value={analytics?.activeUsers30d ?? "—"}
          changePct={analytics?.activeUsers30d ? 100 : 0}
          sparkline={[1, 1, 2, 2, 2, analytics?.activeUsers30d || 0, analytics?.activeUsers30d || 0]}
          sparkColor="#f59e0b"
          icon={Activity}
        />
        <AdminKpiCard
          label="Chat (30d)"
          value={platform?.chatMessages30d ?? "—"}
          changePct={platform?.chatMessages30d ? 45 : 0}
          sparkline={[4, 8, 12, 16, 20, 24, platform?.chatMessages30d || 0]}
          sparkColor="#10b981"
          icon={MessageSquare}
        />
        <AdminKpiCard
          label="Chatgroepen"
          value={platform?.chatGroups ?? "—"}
          changePct={0}
          sparkline={[1, 1, 1, 1, 1, 1, platform?.chatGroups || 0]}
          sparkColor="#64748b"
          icon={MessageSquare}
        />
        <AdminKpiCard
          label="Met programma"
          value={platform?.athletesWithPrograms ?? "—"}
          changePct={trends.athletes.change}
          sparkline={trends.athletes.spark}
          sparkColor="#10b981"
          icon={UserCheck}
        />
        <AdminKpiCard
          label="Gem. invulscore"
          value={avgInvulscore}
          changePct={platform?.avgInvulscore ? 6 : 0}
          sparkline={[70, 72, 75, 78, 80, 82, platform?.avgInvulscore || 0]}
          sparkColor="#10b981"
          icon={Activity}
        />
      </div>

      <div className="admin-dashboard-mid grid gap-4 lg:grid-cols-2">
        <section className="admin-panel admin-action-panel">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h2 className="admin-panel-title">Actie vereist</h2>
          </div>
          {actionItems.length === 0 ? (
            <p className="admin-muted mt-4 text-[13px]">
              Geen openstaande acties. Alles is bijgewerkt.
            </p>
          ) : (
            <ul className="admin-action-list mt-4">
              {actionItems.map((item) => (
                <li
                  key={item.id}
                  className={`admin-action-item admin-action-item--${item.tone}`}
                >
                  <p className="admin-strong text-[13px]">{item.label}</p>
                  <Link
                    href={item.href}
                    className="admin-btn admin-btn--ghost admin-btn--sm shrink-0"
                  >
                    {item.action}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel">
          <h2 className="admin-panel-title">Snelle acties</h2>
          <div className="admin-quick-grid mt-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="admin-quick-card app-focus-ring"
                >
                  <span className="admin-quick-card-icon">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="admin-quick-card-label">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className="admin-dashboard-bottom grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="admin-panel admin-panel--flush">
          <div className="admin-panel-header px-4 sm:px-5">
            <h2 className="admin-panel-title">Recente accounts</h2>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table admin-recent-table">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th className="admin-col-hide-sm">E-mail</th>
                  <th>Rol</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <p className="admin-empty">Nog geen gebruikers.</p>
                    </td>
                  </tr>
                ) : (
                  recentUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`admin-avatar ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                          >
                            {getInitials(user.full_name)}
                          </span>
                          <span className="admin-strong truncate">
                            {user.full_name || "Naamloos"}
                          </span>
                        </div>
                      </td>
                      <td className="admin-col-hide-sm admin-muted truncate">
                        {user.email || "—"}
                      </td>
                      <td>
                        <AdminRoleBadge
                          role={user.role}
                          pendingKind={user.pending_kind}
                        />
                      </td>
                      <td>
                        <span className="admin-status-pill admin-status-pill--active">
                          Actief
                        </span>
                        <span className="admin-muted ml-1.5 hidden text-[11px] sm:inline">
                          · {formatTimeAgo(user.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-4">
          <section className="admin-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="admin-panel-title">Platformstatus</h2>
                {healthOk ? (
                  <p className="admin-status-ok mt-1 flex items-center gap-1.5 text-[13px]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Alles operationeel
                  </p>
                ) : (
                  <p className="mt-1 text-[13px] text-amber-300">
                    Aandacht vereist
                  </p>
                )}
              </div>
            </div>
            <ul className="admin-health-list mt-4">
              {[
                {
                  label: "Supabase URL",
                  ok: health?.checks.supabaseConfigured ?? false,
                },
                {
                  label: "Service role",
                  ok: health?.checks.serviceRolePresent ?? false,
                },
                {
                  label: "Cron secret",
                  ok: health?.checks.cronSecretPresent ?? false,
                },
              ].map((check) => (
                <li key={check.label} className="admin-health-row">
                  <span className="admin-muted text-[13px]">{check.label}</span>
                  <span
                    className={`admin-badge ${
                      check.ok ? "admin-badge--success" : "admin-badge--danger"
                    }`}
                  >
                    {check.ok ? "OK" : "Ontbreekt"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Snel overzicht (vandaag)</h2>
            <ul className="admin-today-list mt-4">
              <li className="admin-today-row">
                <span className="admin-muted text-[13px]">Nieuwe gebruikers</span>
                <span className="admin-strong">{todayStats.newUsers}</span>
              </li>
              <li className="admin-today-row">
                <span className="admin-muted text-[13px]">Nieuwe coaches</span>
                <span className="admin-strong">{todayStats.newCoaches}</span>
              </li>
              <li className="admin-today-row">
                <span className="admin-muted text-[13px]">Chat berichten</span>
                <span className="admin-strong">~{todayStats.chatMessages}</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
