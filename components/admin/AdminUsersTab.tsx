"use client";

import { useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

export type AdminUser = {
  id: string;
  full_name: string | null;
  role: string | null;
  email: string | null;
  created_at: string | null;
  coach_id: string | null;
  coach_name: string | null;
  pending_kind?: string | null;
};

const roleLabels: Record<string, string> = {
  coach: "Coach",
  atleet: "Atleet",
  admin: "Admin",
  pending: "In afwachting",
};

type AdminUsersTabProps = {
  users: AdminUser[];
  onUsersChange: (users: AdminUser[]) => void;
};

export default function AdminUsersTab({
  users,
  onUsersChange,
}: AdminUsersTabProps) {
  const coaches = useMemo(
    () => users.filter((user) => user.role === "coach"),
    [users],
  );

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

  const coachGroups = useMemo(() => {
    const athletes = users.filter((user) => user.role === "atleet");
    return coaches.map((coach) => ({
      coach,
      athletes: athletes.filter((athlete) => athlete.coach_id === coach.id),
    }));
  }, [users, coaches]);

  const unassignedAthletes = useMemo(
    () => users.filter((user) => user.role === "atleet" && !user.coach_id),
    [users],
  );

  async function assignAthleteToCoach(
    athleteId: string,
    coachId: string | null,
  ) {
    const { error } = await supabase
      .from("profiles")
      .update({ coach_id: coachId || null })
      .eq("id", athleteId);

    if (error) {
      alert(error.message);
      return;
    }

    onUsersChange(
      users.map((user) =>
        user.id === athleteId
          ? {
              ...user,
              coach_id: coachId,
              coach_name:
                coaches.find((coach) => coach.id === coachId)?.full_name ||
                null,
            }
          : user,
      ),
    );
  }

  async function deleteUser(userId: string) {
    const confirmed = window.confirm(
      "Weet je zeker dat je deze gebruiker permanent wilt verwijderen?",
    );
    if (!confirmed) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/admin/delete-user", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({ userId }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      alert(payload.error || "Verwijderen mislukt.");
      return;
    }

    onUsersChange(users.filter((user) => user.id !== userId));
  }

  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Totaal" value={counts.total} />
        <StatCard label="Coaches" value={counts.coach || 0} />
        <StatCard label="Atleten" value={counts.atleet || 0} />
        <StatCard label="In afwachting" value={counts.pending || 0} />
      </div>

      <div className="mb-6 space-y-4">
        <h2 className="text-xl font-bold text-black">Atleten per coach</h2>
        {coachGroups.map(({ coach, athletes }) => (
          <section
            key={coach.id}
            className="overflow-hidden rounded-3xl bg-white shadow-xl"
          >
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h3 className="font-bold text-black">
                {coach.full_name || "Coach zonder naam"}
              </h3>
              <p className="text-sm text-gray-500">
                {coach.email || "—"} · {athletes.length} atleet
                {athletes.length === 1 ? "" : "en"}
              </p>
            </div>
            {athletes.length === 0 ? (
              <p className="px-4 py-5 text-sm text-gray-500">
                Nog geen gekoppelde atleten.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {athletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-black">
                        {athlete.full_name || "Naamloos"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {athlete.email || "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {unassignedAthletes.length > 0 && (
          <section className="overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h3 className="font-bold text-black">Atleten zonder coach</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {unassignedAthletes.map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-black">
                      {athlete.full_name || "Naamloos"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {athlete.email || "—"}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Coach</span>
                    <select
                      value=""
                      onChange={(event) =>
                        void assignAthleteToCoach(
                          athlete.id,
                          event.target.value || null,
                        )
                      }
                      className="rounded-xl border border-gray-300 px-3 py-2"
                    >
                      <option value="">Kies coach...</option>
                      {coaches.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.full_name || coach.email || "Coach"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-xl font-bold text-black">Alle gebruikers</h2>
        </div>
        <div className="table-compact-wrap">
          <table className="table-compact">
            <thead className="text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th>Naam</th>
                <th className="col-hide-sm">E-mail</th>
                <th>Rol</th>
                <th className="col-hide-sm">Coach</th>
                <th className="col-hide-sm">Koppelen</th>
                <th className="col-hide-sm">Aangemaakt</th>
                <th>Acties</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-semibold text-black">
                    {user.full_name || "Naamloos"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 col-hide-sm">
                    {user.email || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                      {user.role === "pending" && user.pending_kind === "coach"
                        ? "Coach (pending)"
                        : roleLabels[user.role || ""] ||
                          user.role ||
                          "Onbekend"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 col-hide-sm">
                    {user.coach_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 col-hide-sm">
                    {user.role === "atleet" ? (
                      <select
                        value={user.coach_id || ""}
                        onChange={(event) =>
                          void assignAthleteToCoach(
                            user.id,
                            event.target.value || null,
                          )
                        }
                        className="max-w-[180px] rounded-xl border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">Geen coach</option>
                        {coaches.map((coach) => (
                          <option key={coach.id} value={coach.id}>
                            {coach.full_name || coach.email || "Coach"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 col-hide-sm">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void deleteUser(user.id)}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Verwijderen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-black">{value}</p>
    </div>
  );
}
