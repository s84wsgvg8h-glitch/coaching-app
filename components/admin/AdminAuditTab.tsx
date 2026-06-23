"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { loadCoachApprovalReviews, type CoachApprovalReview } from "@/lib/adminCoachReviews";
import {
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

export default function AdminAuditTab() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<CoachApprovalReview[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    void loadCoachApprovalReviews().then((rows) => {
      setReviews(rows);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <AdminLoading label="Auditlog laden…" />;
  }

  const accepted = reviews.filter((r) => r.action === "accepted").length;
  const rejected = reviews.filter((r) => r.action === "rejected").length;
  const paged = reviews.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="admin-tab-page">
      <AdminPageHeader
        title="Auditlog"
        subtitle="Overzicht van admin-acties rond coach-goedkeuringen en platformwijzigingen."
        icon={ScrollText}
      />

      <div className="admin-summary-grid admin-summary-grid--4">
        <AdminSummaryCard
          label="Totaal"
          value={reviews.length}
          subtext="Auditregels"
          icon={ScrollText}
          tone="blue"
        />
        <AdminSummaryCard
          label="Goedgekeurd"
          value={accepted}
          icon={ScrollText}
          tone="green"
        />
        <AdminSummaryCard
          label="Afgewezen"
          value={rejected}
          icon={ScrollText}
          tone="red"
        />
        <AdminSummaryCard
          label="Laatste actie"
          value={
            reviews[0]
              ? formatDateNl(reviews[0].created_at)
              : "—"
          }
          icon={ScrollText}
          tone="purple"
        />
      </div>

      <AdminPanel flush>
        {reviews.length === 0 ? (
          <AdminEmptyState
            title="Nog geen auditregels"
            description="Goedkeuringen en afwijzingen worden hier gelogd."
          />
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tijd</th>
                    <th>Actie</th>
                    <th className="admin-col-hide-sm">Coach</th>
                    <th className="admin-col-hide-sm">Admin</th>
                    <th>Notities</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((review) => (
                    <tr key={review.id}>
                      <td className="admin-muted whitespace-nowrap text-[12px]">
                        {new Date(review.created_at).toLocaleString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        <span
                          className={`admin-badge ${
                            review.action === "accepted"
                              ? "admin-badge--success"
                              : "admin-badge--danger"
                          }`}
                        >
                          {review.action === "accepted"
                            ? "Goedgekeurd"
                            : "Afgewezen"}
                        </span>
                      </td>
                      <td className="admin-col-hide-sm admin-strong">
                        {review.profile_name || "—"}
                      </td>
                      <td className="admin-col-hide-sm admin-muted">
                        {review.admin_name || "—"}
                      </td>
                      <td className="admin-muted max-w-[220px] truncate text-[12px]">
                        {review.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={reviews.length}
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
