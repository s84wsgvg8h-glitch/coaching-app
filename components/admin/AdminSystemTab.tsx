"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import type { CalendarSyncLogEntry } from "@/lib/calendarSyncLog";

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

export default function AdminSystemTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthPayload | null>(null);

  useEffect(() => {
    void adminFetch<HealthPayload>("/api/admin/health").then((result) => {
      if (result.data) setData(result.data);
      else if (result.error) alert(result.error);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return <p className="text-sm text-gray-500">Systeemstatus laden...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Supabase health</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Check label="Supabase URL" ok={data.checks.supabaseConfigured} />
          <Check label="Service role" ok={data.checks.serviceRolePresent} />
          <Check label="Cron secret" ok={data.checks.cronSecretPresent} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {Object.entries(data.tableCounts).map(([table, count]) => (
            <div
              key={table}
              className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="text-gray-600">{table}</span>
              <span className="font-bold text-black">{count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Kalender sync logs</h2>
        {data.lastSync ? (
          <p className="mt-2 text-sm text-gray-600">
            Laatste sync:{" "}
            {new Date(data.lastSync.created_at).toLocaleString("nl-NL")} ·{" "}
            {data.lastSync.status} · {data.lastSync.inserted_count} toegevoegd
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-500">Nog geen sync-logs.</p>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="py-2">Tijd</th>
                <th className="py-2">Status</th>
                <th className="py-2">Opgehaald</th>
                <th className="py-2">Toegevoegd</th>
                <th className="py-2">Overgeslagen</th>
                <th className="py-2">Fout</th>
              </tr>
            </thead>
            <tbody>
              {data.syncLogs.map((log) => (
                <tr key={log.id} className="border-t border-gray-100">
                  <td className="py-2">
                    {new Date(log.created_at).toLocaleString("nl-NL")}
                  </td>
                  <td className="py-2">{log.status}</td>
                  <td className="py-2">{log.fetched_count}</td>
                  <td className="py-2">{log.inserted_count}</td>
                  <td className="py-2">{log.skipped_count}</td>
                  <td className="py-2 text-red-600">
                    {log.error_message || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`rounded-xl px-3 py-2 text-sm font-semibold ${
        ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
      }`}
    >
      {label}: {ok ? "OK" : "Ontbreekt"}
    </div>
  );
}
