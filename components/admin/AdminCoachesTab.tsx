"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScrollText, UserCheck } from "lucide-react";
import {
  insertCoachApprovalReview,
  loadCoachApprovalReviews,
  type CoachApprovalReview,
} from "@/lib/adminCoachReviews";
import { supabase } from "@/lib/supabaseClient";
import type { AdminUser } from "@/components/admin/AdminUsersTab";
import {
  AdminPageHeader,
  AdminSummaryCard,
} from "@/components/admin/AdminPageParts";
import {
  AdminEmptyState,
  AdminPanel,
  AdminRoleBadge,
} from "@/components/admin/AdminUi";

type AdminCoachesTabProps = {
  users: AdminUser[];
  adminId: string;
  onReload: () => Promise<void>;
  onDeleteUser: (
    userId: string,
    options?: { skipConfirm?: boolean },
  ) => Promise<void>;
};

export default function AdminCoachesTab({
  users,
  adminId,
  onReload,
  onDeleteUser,
}: AdminCoachesTabProps) {
  const [reviews, setReviews] = useState<CoachApprovalReview[]>([]);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingCoaches = useMemo(
    () =>
      users.filter(
        (user) => user.role === "pending" && user.pending_kind === "coach",
      ),
    [users],
  );

  const acceptedCount = useMemo(
    () => reviews.filter((r) => r.action === "accepted").length,
    [reviews],
  );

  const rejectedCount = useMemo(
    () => reviews.filter((r) => r.action === "rejected").length,
    [reviews],
  );

  useEffect(() => {
    void loadCoachApprovalReviews().then(setReviews);
  }, [users]);

  async function acceptCoach(userId: string) {
    setProcessingId(userId);
    const notes = notesDraft[userId]?.trim() || null;

    const { error } = await supabase
      .from("profiles")
      .update({ role: "coach", pending_kind: null })
      .eq("id", userId);

    if (error) {
      alert(error.message);
      setProcessingId(null);
      return;
    }

    await insertCoachApprovalReview({
      profileId: userId,
      adminId,
      action: "accepted",
      notes,
    });

    await onReload();
    setReviews(await loadCoachApprovalReviews());
    setProcessingId(null);
  }

  async function rejectCoach(userId: string) {
    if (!window.confirm("Coach-aanmelding afwijzen en account verwijderen?")) {
      return;
    }

    setProcessingId(userId);
    const notes = notesDraft[userId]?.trim() || null;

    await insertCoachApprovalReview({
      profileId: userId,
      adminId,
      action: "rejected",
      notes,
    });

    await onDeleteUser(userId, { skipConfirm: true });
    setReviews(await loadCoachApprovalReviews());
    setProcessingId(null);
  }

  return (
    <div className="admin-tab-page">
      <AdminPageHeader
        title="Coach-goedkeuring"
        subtitle="Keur coach-aanmeldingen goed of af. Notities worden opgeslagen in de auditlog."
        icon={UserCheck}
        actions={
          <Link href="/admin?tab=audit" className="admin-btn admin-btn--ghost">
            <ScrollText className="h-4 w-4" />
            Auditlog
          </Link>
        }
      />

      <div className="admin-summary-grid admin-summary-grid--4">
        <AdminSummaryCard
          label="Wachtend"
          value={pendingCoaches.length}
          subtext="Openstaande aanmeldingen"
          icon={UserCheck}
          tone="amber"
        />
        <AdminSummaryCard
          label="Goedgekeurd"
          value={acceptedCount}
          subtext="Totaal reviews"
          icon={UserCheck}
          tone="green"
        />
        <AdminSummaryCard
          label="Afgewezen"
          value={rejectedCount}
          subtext="Totaal reviews"
          icon={UserCheck}
          tone="red"
        />
        <AdminSummaryCard
          label="Reviews"
          value={reviews.length}
          subtext="Alle tijden"
          icon={ScrollText}
          tone="blue"
        />
      </div>

      <AdminPanel>
        <h2 className="admin-panel-title">Openstaande aanmeldingen</h2>
        {pendingCoaches.length === 0 ? (
          <AdminEmptyState
            title="Geen openstaande aanmeldingen"
            description="Nieuwe coach-aanmeldingen verschijnen hier."
          />
        ) : (
          <div className="mt-4 space-y-3">
            {pendingCoaches.map((user) => (
              <div key={user.id} className="admin-card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="admin-strong">{user.full_name || "Naamloos"}</p>
                    <p className="text-[13px] admin-muted">{user.email || "—"}</p>
                  </div>
                  <AdminRoleBadge role="pending" pendingKind="coach" />
                </div>
                <label className="admin-field block">
                  <span className="admin-label">Notities (optioneel)</span>
                  <textarea
                    value={notesDraft[user.id] || ""}
                    onChange={(event) =>
                      setNotesDraft((current) => ({
                        ...current,
                        [user.id]: event.target.value,
                      }))
                    }
                    rows={2}
                    className="admin-textarea mt-1"
                    placeholder="Bijv. ervaring, specialisatie…"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void acceptCoach(user.id)}
                    disabled={processingId === user.id}
                    className="admin-btn admin-btn--primary"
                  >
                    {processingId === user.id ? "Bezig…" : "Accepteren"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void rejectCoach(user.id)}
                    disabled={processingId === user.id}
                    className="admin-btn admin-btn--danger"
                  >
                    Afwijzen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
