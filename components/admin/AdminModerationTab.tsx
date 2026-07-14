"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Flag } from "lucide-react";
import {
  getChatReportReasonLabel,
  loadChatContentReports,
  updateChatContentReportStatus,
  type ChatContentReportRow,
  type ChatContentReportView,
} from "@/lib/adminChatReports";
import {
  AdminFilterBar,
  AdminPageHeader,
  AdminPagination,
  AdminSummaryCard,
  formatDateNl,
} from "@/components/admin/AdminPageParts";
import {
  AdminEmptyState,
  AdminLoading,
  AdminPanel,
} from "@/components/admin/AdminUi";

const STATUS_OPTIONS: ChatContentReportRow["status"][] = [
  "pending",
  "reviewed",
  "dismissed",
  "actioned",
];

const STATUS_LABELS: Record<ChatContentReportRow["status"], string> = {
  pending: "Open",
  reviewed: "Beoordeeld",
  dismissed: "Afgewezen",
  actioned: "Actie",
};

export default function AdminModerationTab() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ChatContentReportView[]>([]);
  const [filter, setFilter] = useState<"all" | ChatContentReportRow["status"]>(
    "pending",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [updatingId, setUpdatingId] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    const { reports: loaded, error } = await loadChatContentReports();
    if (error) {
      setReports([]);
    } else {
      setReports(loaded);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      const { reports: loaded, error } = await loadChatContentReports();
      if (cancelled) return;
      setReports(error ? [] : loaded);
      setLoading(false);
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return reports;
    return reports.filter((report) => report.status === filter);
  }, [filter, reports]);

  const pendingCount = reports.filter((report) => report.status === "pending").length;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleStatusChange(
    reportId: string,
    status: ChatContentReportRow["status"],
  ) {
    setUpdatingId(reportId);
    const { error } = await updateChatContentReportStatus(reportId, status);
    setUpdatingId("");

    if (error) {
      alert(error.message);
      return;
    }

    setReports((current) =>
      current.map((report) =>
        report.id === reportId ? { ...report, status } : report,
      ),
    );
  }

  if (loading) {
    return <AdminLoading label="Meldingen laden…" />;
  }

  return (
    <div className="admin-tab-page">
      <AdminPageHeader
        title="Content moderatie"
        subtitle="Chat-meldingen van gebruikers. Beoordeel en werk status bij binnen 24 uur."
        icon={Flag}
      />

      <div className="admin-summary-grid admin-summary-grid--4">
        <AdminSummaryCard
          label="Open"
          value={pendingCount}
          subtext="Wacht op review"
          icon={Flag}
          tone="amber"
        />
        <AdminSummaryCard
          label="Totaal"
          value={reports.length}
          icon={Flag}
          tone="blue"
        />
        <AdminSummaryCard
          label="Actie ondernomen"
          value={reports.filter((report) => report.status === "actioned").length}
          icon={Flag}
          tone="red"
        />
        <AdminSummaryCard
          label="Laatste melding"
          value={reports[0] ? formatDateNl(reports[0].created_at) : "—"}
          icon={Flag}
          tone="purple"
        />
      </div>

      <AdminFilterBar>
        {(["all", ...STATUS_OPTIONS] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setFilter(option);
              setPage(1);
            }}
            className={`admin-invite-tab app-focus-ring min-h-11 ${
              filter === option ? "is-active" : ""
            }`}
          >
            {option === "all" ? "Alle" : STATUS_LABELS[option]}
          </button>
        ))}
      </AdminFilterBar>

      <AdminPanel flush>
        {filtered.length === 0 ? (
          <AdminEmptyState
            title="Geen meldingen"
            description={
              filter === "pending"
                ? "Er staan geen open meldingen."
                : "Geen meldingen voor dit filter."
            }
          />
        ) : (
          <>
            <div className="admin-table-wrap table-compact-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tijd</th>
                    <th>Melder</th>
                    <th className="admin-col-hide-sm">Gemeld</th>
                    <th>Reden</th>
                    <th className="admin-col-hide-sm">Context</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((report) => (
                    <tr key={report.id}>
                      <td className="admin-muted whitespace-nowrap text-[12px]">
                        {new Date(report.created_at).toLocaleString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="max-w-[120px] truncate">{report.reporter_name}</td>
                      <td className="admin-col-hide-sm max-w-[120px] truncate">
                        {report.reported_name || "—"}
                      </td>
                      <td>{getChatReportReasonLabel(report.reason)}</td>
                      <td className="admin-col-hide-sm max-w-[220px]">
                        <p className="truncate text-[12px] text-app-muted">
                          {report.details ||
                            (report.message_id
                              ? `Bericht ${report.message_id.slice(0, 8)}…`
                              : report.group_id
                                ? `Groep ${report.group_id.slice(0, 8)}…`
                                : "—")}
                        </p>
                      </td>
                      <td>
                        <select
                          value={report.status}
                          disabled={updatingId === report.id}
                          onChange={(event) =>
                            void handleStatusChange(
                              report.id,
                              event.target.value as ChatContentReportRow["status"],
                            )
                          }
                          className="admin-select min-h-11 max-w-[140px] text-[12px]"
                          aria-label={`Status voor melding ${report.id}`}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}
      </AdminPanel>
    </div>
  );
}
