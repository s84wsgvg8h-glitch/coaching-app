"use client";

import { useEffect, useMemo, useState } from "react";
import {
  insertCoachApprovalReview,
  loadCoachApprovalReviews,
  type CoachApprovalReview,
} from "@/lib/adminCoachReviews";
import { supabase } from "@/lib/supabaseClient";
import type { AdminUser } from "@/components/admin/AdminUsersTab";

type AdminCoachesTabProps = {
  users: AdminUser[];
  adminId: string;
  onReload: () => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
};

export default function AdminCoachesTab({
  users,
  adminId,
  onReload,
  onDeleteUser,
}: AdminCoachesTabProps) {
  const [reviews, setReviews] = useState<CoachApprovalReview[]>([]);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const pendingCoaches = useMemo(
    () =>
      users.filter(
        (user) => user.role === "pending" && user.pending_kind === "coach",
      ),
    [users],
  );

  useEffect(() => {
    void loadCoachApprovalReviews().then(setReviews);
  }, [users]);

  async function acceptCoach(userId: string) {
    const notes = notesDraft[userId]?.trim() || null;

    const { error } = await supabase
      .from("profiles")
      .update({ role: "coach", pending_kind: null })
      .eq("id", userId);

    if (error) {
      alert(error.message);
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
  }

  async function rejectCoach(userId: string) {
    const notes = notesDraft[userId]?.trim() || null;

    await insertCoachApprovalReview({
      profileId: userId,
      adminId,
      action: "rejected",
      notes,
    });

    await onDeleteUser(userId);
    setReviews(await loadCoachApprovalReviews());
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Coach-aanmeldingen</h2>
        <p className="mt-1 text-sm text-gray-500">
          Keur coaches goed of af. Optionele notities worden opgeslagen in de
          reviewgeschiedenis.
        </p>

        {pendingCoaches.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Geen openstaande aanmeldingen.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingCoaches.map((user) => (
              <div
                key={user.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <p className="font-semibold text-black">
                  {user.full_name || "Naamloos"}
                </p>
                <p className="text-sm text-gray-500">{user.email || "—"}</p>
                <label className="mt-3 block text-sm">
                  <span className="text-gray-500">Reviewnotities (optioneel)</span>
                  <textarea
                    value={notesDraft[user.id] || ""}
                    onChange={(event) =>
                      setNotesDraft((current) => ({
                        ...current,
                        [user.id]: event.target.value,
                      }))
                    }
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                    placeholder="Bijv. ervaring, specialisatie..."
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void acceptCoach(user.id)}
                    className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                  >
                    Accepteren
                  </button>
                  <button
                    type="button"
                    onClick={() => void rejectCoach(user.id)}
                    className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Afwijzen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Reviewgeschiedenis</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Nog geen reviews.</p>
        ) : (
          <div className="mt-4 divide-y divide-gray-100">
            {reviews.map((review) => (
              <div key={review.id} className="py-3 text-sm">
                <p className="font-semibold text-black">
                  {review.profile_name || "Onbekend"} ·{" "}
                  {review.action === "accepted" ? "Goedgekeurd" : "Afgewezen"}
                </p>
                <p className="text-gray-500">
                  Door {review.admin_name || "admin"} ·{" "}
                  {new Date(review.created_at).toLocaleString("nl-NL")}
                </p>
                {review.notes ? (
                  <p className="mt-1 text-gray-700">{review.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
