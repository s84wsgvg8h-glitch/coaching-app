"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Database,
  RefreshCw,
  Server,
} from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";
import type { CalendarSyncLogEntry } from "@/lib/calendarSyncLog";
import AdminProductionPanel from "@/components/admin/AdminProductionPanel";
import AdminDemoPanel from "@/components/admin/AdminDemoPanel";
import { AdminPageHeader } from "@/components/admin/AdminPageParts";
import {
  AdminLoading,
  AdminPanel,
  AdminPanelHeader,
  AdminStat,
} from "@/components/admin/AdminUi";

type HealthPayload = {
  tableCounts: Record<string, number>;
  lastSync: CalendarSyncLogEntry | null;
  syncLogs: CalendarSyncLogEntry[];
  checks: {
    supabaseConfigured: boolean;
    serviceRolePresent: boolean;
    cronSecretPresent: boolean;
  };
};

const TABLE_LABELS: Record<string, string> = {
  profiles: "Profielen",
  messages: "Berichten",
  chat_groups: "Chatgroepen",
  program_blocks: "Programmablokken",
  coach_invite_links: "Coach-uitnodigingen",
  coach_signup_invites: "Coach-aanmeldingen",
  wedstrijden: "Wedstrijden",
  calendar_sync_logs: "Sync logs",
  admin_knowledge_chunks: "Kennisbank",
};

const HEALTH_CHECKS = [
  { key: "supabaseConfigured" as const, label: "Supabase" },
  { key: "serviceRolePresent" as const, label: "Service role" },
  { key: "cronSecretPresent" as const, label: "Cron secret" },
];

export default function AdminSystemTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthPayload | null>(null);
  const [rangeDays, setRangeDays] = useState(7);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">(
    "all",
  );

  useEffect(() => {
    void adminFetch<HealthPayload>("/api/admin/health").then((result) => {
      if (result.data) setData(result.data);
      else if (result.error) alert(result.error);
      setLoading(false);
    });
  }, []);

  const filteredLogs = useMemo(() => {
    if (!data) return [];
    if (statusFilter === "all") return data.syncLogs;
    return data.syncLogs.filter((log) => log.status === statusFilter);
  }, [data, statusFilter]);

  if (loading || !data) {
    return <AdminLoading label="Systeemstatus laden…" />;
  }

  return (
    <div className="admin-tab-page">
      <AdminPageHeader
        title="Systeem"
        subtitle="Health checks, database-statistieken en synchronisatielogs."
        icon={Server}
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
              href="/admin?tab=settings"
              className="admin-btn admin-btn--primary w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Synchronisatie uitvoeren
            </Link>
          </>
        }
      />

      <AdminProductionPanel />

      <AdminDemoPanel />

      <div className="admin-health-strip">
        {HEALTH_CHECKS.map((check) => {
          const ok = data.checks[check.key];
          return (
            <div key={check.key} className="admin-health-card">
              <span
                className={`admin-health-dot ${ok ? "admin-health-dot--ok" : "admin-health-dot--bad"}`}
              />
              <div className="min-w-0">
                <p className="admin-strong text-[13px]">{check.label}</p>
                <p className={`text-[12px] ${ok ? "admin-status-ok" : "text-red-400"}`}>
                  {ok ? "Operationeel" : "Ontbreekt"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {!data.checks.cronSecretPresent ? (
        <AdminPanel className="admin-alert-banner">
          <div className="flex flex-wrap items-start gap-3">
            <span className="admin-alert-icon">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="admin-strong text-[14px]">Cron secret ontbreekt</p>
              <p className="admin-muted mt-1 text-[13px]">
                Geplande taken (herinneringen, broadcasts) werken niet zonder{" "}
                <code className="text-amber-200">CRON_SECRET</code>. Stel deze in
                via Vercel environment variables.
              </p>
            </div>
            <Link
              href="/admin?tab=settings"
              className="admin-btn admin-btn--ghost admin-btn--sm shrink-0"
            >
              Naar instellingen
            </Link>
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel>
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-4 w-4 text-app-muted" />
          <h2 className="admin-panel-title">Database-statistieken</h2>
        </div>
        <div className="admin-stat-grid admin-stat-grid--4">
          {Object.entries(data.tableCounts).map(([table, count]) => (
            <AdminStat
              key={table}
              label={TABLE_LABELS[table] || table}
              value={count.toLocaleString("nl-NL")}
            />
          ))}
        </div>
      </AdminPanel>

      <AdminPanel flush>
        <div className="admin-table-toolbar">
          <div>
            <h2 className="admin-panel-title">Sync logs</h2>
            {data.lastSync ? (
              <p className="admin-muted mt-0.5 text-[12px]">
                Laatste sync:{" "}
                {new Date(data.lastSync.created_at).toLocaleString("nl-NL")} ·{" "}
                {data.lastSync.inserted_count} toegevoegd
              </p>
            ) : (
              <p className="admin-muted mt-0.5 text-[12px]">Nog geen sync-logs.</p>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "success" | "error")
            }
            className="admin-select admin-toolbar-select !w-auto text-[12px]"
            aria-label="Filter op status"
          >
            <option value="all">Alle statussen</option>
            <option value="success">Succes</option>
            <option value="error">Fout</option>
          </select>
        </div>

        {filteredLogs.length === 0 ? (
          <p className="admin-empty px-4">Geen sync-logregels voor dit filter.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tijd</th>
                  <th>Status</th>
                  <th className="admin-col-hide-sm">Bron</th>
                  <th>Opgehaald</th>
                  <th>Toegevoegd</th>
                  <th className="admin-col-hide-sm">Overgeslagen</th>
                  <th className="admin-col-hide-sm">Fout</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("nl-NL")}
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          log.status === "success"
                            ? "admin-badge--success"
                            : "admin-badge--danger"
                        }`}
                      >
                        {log.status === "success" ? "Succes" : "Fout"}
                      </span>
                    </td>
                    <td className="admin-col-hide-sm admin-muted">
                      {log.source || "—"}
                    </td>
                    <td>{log.fetched_count}</td>
                    <td>{log.inserted_count}</td>
                    <td className="admin-col-hide-sm">{log.skipped_count}</td>
                    <td className="admin-col-hide-sm max-w-[200px] truncate">
                      {log.error_message ? (
                        <span className="admin-badge admin-badge--danger">
                          {log.error_message}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-white/6 px-4 py-3">
          <Link
            href="/admin?tab=settings"
            className="text-[13px] font-semibold text-blue-400 hover:text-blue-300"
          >
            Bekijk alle sync logs →
          </Link>
        </div>
      </AdminPanel>
    </div>
  );
}
