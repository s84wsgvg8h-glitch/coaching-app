"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Download,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { syncAthleteOrganizationFromCoach } from "@/lib/orgAthleteScope";
import {
  AdminAvatar,
  AdminFilterBar,
  AdminPageHeader,
  AdminPagination,
  AdminSummaryCard,
  AdminTableToolbar,
  formatTimeAgo,
  pctChange,
} from "@/components/admin/AdminPageParts";
import { AdminPanel, AdminRoleBadge } from "@/components/admin/AdminUi";
import Toast, { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmProvider";

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

type AdminUsersTabProps = {
  users: AdminUser[];
  adminId: string;
  onUsersChange: (users: AdminUser[]) => void;
  onDeleteUser: (
    userId: string,
    options?: { skipConfirm?: boolean },
  ) => Promise<void>;
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

function exportUsersJson(users: AdminUser[]) {
  const blob = new Blob([JSON.stringify(users, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `limitless-users-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function UserRowMenu({
  user,
  adminId,
  coaches,
  onRoleChange,
  onCoachAssign,
  onDelete,
  onApprovePending,
  onRejectPending,
}: {
  user: AdminUser;
  adminId: string;
  coaches: AdminUser[];
  onRoleChange: (userId: string, role: string) => void;
  onCoachAssign: (athleteId: string, coachId: string | null) => void;
  onDelete: (userId: string) => void;
  onApprovePending: (userId: string, pendingKind?: string | null) => void;
  onRejectPending: (userId: string) => void;
}) {
  const isSelf = user.id === adminId;

  return (
    <details className="admin-row-menu">
      <summary aria-label={`Acties voor ${user.full_name || user.email}`}>
        <MoreHorizontal className="h-4 w-4" />
      </summary>
      <div className="admin-row-menu-panel">
        <Link
          href={`/profile/${user.id}`}
          className="admin-row-menu-item"
        >
          Profiel bekijken
        </Link>

        {!isSelf ? (
          <label className="admin-row-menu-item flex flex-col !items-stretch gap-1 !py-2">
            <span className="text-[11px] text-app-subtle">Rol wijzigen</span>
            <select
              value={user.role || "atleet"}
              onChange={(event) => onRoleChange(user.id, event.target.value)}
              className="admin-select !min-h-[36px] text-[12px]"
              aria-label={`Rol wijzigen voor ${user.full_name || user.email}`}
            >
              <option value="admin">Admin</option>
              <option value="coach">Coach</option>
              <option value="atleet">Atleet</option>
              <option value="pending">In afwachting</option>
            </select>
          </label>
        ) : null}

        {user.role === "atleet" && !isSelf ? (
          <label className="admin-row-menu-item flex flex-col !items-stretch gap-1 !py-2">
            <span className="text-[11px] text-app-subtle">Coach koppelen</span>
            <select
              value={user.coach_id || ""}
              onChange={(event) =>
                onCoachAssign(user.id, event.target.value || null)
              }
              className="admin-select !min-h-[36px] text-[12px]"
              aria-label={`Coach koppelen voor ${user.full_name || user.email}`}
            >
              <option value="">Geen coach</option>
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.full_name || coach.email || "Coach"}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {!isSelf && user.role === "pending" ? (
          <>
            <button
              type="button"
              onClick={() => onApprovePending(user.id, user.pending_kind)}
              className="admin-row-menu-item !text-emerald-300"
            >
              Goedkeuren
            </button>
            <button
              type="button"
              onClick={() => onRejectPending(user.id)}
              className="admin-row-menu-item admin-row-menu-item--danger"
            >
              Afwijzen
            </button>
          </>
        ) : null}

        {!isSelf ? (
          <button
            type="button"
            onClick={() => onDelete(user.id)}
            className="admin-row-menu-item admin-row-menu-item--danger"
          >
            Verwijder
          </button>
        ) : null}
      </div>
    </details>
  );
}

export default function AdminUsersTab({
  users,
  adminId,
  onUsersChange,
  onDeleteUser,
}: AdminUsersTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const { message: toastMessage, showToast, clearToast } = useToast();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") || "all",
  );
  const [coachFilter, setCoachFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [refreshing, setRefreshing] = useState(false);

  const coaches = useMemo(
    () => users.filter((user) => user.role === "coach"),
    [users],
  );

  const periodStart = useMemo(() => daysAgo(7), []);
  const prevPeriodStart = useMemo(() => daysAgo(14), []);

  const summary = useMemo(() => {
    const total = users.length;
    const coachCount = users.filter((u) => u.role === "coach").length;
    const athleteCount = users.filter((u) => u.role === "atleet").length;
    const pendingCount = users.filter((u) => u.role === "pending").length;

    const currentTotal = countInRange(users, null, periodStart, new Date());
    const prevTotal = countInRange(users, null, prevPeriodStart, periodStart);
    const currentCoaches = countInRange(users, "coach", periodStart, new Date());
    const prevCoaches = countInRange(
      users,
      "coach",
      prevPeriodStart,
      periodStart,
    );
    const currentAthletes = countInRange(
      users,
      "atleet",
      periodStart,
      new Date(),
    );
    const prevAthletes = countInRange(
      users,
      "atleet",
      prevPeriodStart,
      periodStart,
    );
    const currentPending = countInRange(
      users,
      "pending",
      periodStart,
      new Date(),
    );
    const prevPending = countInRange(
      users,
      "pending",
      prevPeriodStart,
      periodStart,
    );

    return {
      total,
      coachCount,
      athleteCount,
      pendingCount,
      totalTrend: pctChange(currentTotal, prevTotal),
      coachTrend: pctChange(currentCoaches, prevCoaches),
      athleteTrend: pctChange(currentAthletes, prevAthletes),
      pendingTrend: pctChange(currentPending, prevPending),
    };
  }, [users, periodStart, prevPeriodStart]);

  const unassignedCount = useMemo(
    () => users.filter((user) => user.role === "atleet" && !user.coach_id).length,
    [users],
  );

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (statusFilter === "active" && user.role === "pending") return false;
      if (statusFilter === "pending" && user.role !== "pending") return false;
      if (coachFilter !== "all") {
        if (user.role !== "atleet") return false;
        if (coachFilter === "none" && user.coach_id) return false;
        if (coachFilter !== "none" && user.coach_id !== coachFilter) return false;
      }
      if (!q) return true;
      return (
        (user.full_name || "").toLowerCase().includes(q) ||
        (user.email || "").toLowerCase().includes(q) ||
        (user.coach_name || "").toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter, statusFilter, coachFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  const allPageSelected =
    paginatedUsers.length > 0 &&
    paginatedUsers.every((user) => selectedIds.has(user.id));

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, statusFilter, coachFilter, pageSize]);

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

    if (coachId) {
      await syncAthleteOrganizationFromCoach(athleteId, coachId);
    } else {
      await syncAthleteOrganizationFromCoach(athleteId, null);
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

  async function changeUserRole(userId: string, nextRole: string) {
    if (userId === adminId) {
      showToast("Je kunt je eigen admin-rol niet wijzigen.");
      return;
    }

    const confirmed = await confirm({
      title: "Rol wijzigen",
      message: `Rol wijzigen naar "${nextRole}"?`,
      confirmLabel: "Wijzigen",
    });
    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .update({ role: nextRole })
      .eq("id", userId);

    if (error) {
      showToast(error.message);
      return;
    }

    onUsersChange(
      users.map((user) =>
        user.id === userId ? { ...user, role: nextRole } : user,
      ),
    );
  }

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds((current) => {
        const next = new Set(current);
        for (const user of paginatedUsers) next.delete(user.id);
        return next;
      });
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      for (const user of paginatedUsers) next.add(user.id);
      return next;
    });
  }

  function toggleSelectUser(userId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function approvePendingUser(
    userId: string,
    pendingKind?: string | null,
  ) {
    const nextRole = pendingKind === "coach" ? "coach" : "atleet";
    const confirmed = await confirm({
      title: "Account goedkeuren",
      message: `Account goedkeuren als ${nextRole === "coach" ? "coach" : "atleet"}?`,
      confirmLabel: "Goedkeuren",
    });
    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .update({ role: nextRole, pending_kind: null })
      .eq("id", userId);

    if (error) {
      showToast(error.message);
      return;
    }

    onUsersChange(
      users.map((user) =>
        user.id === userId
          ? { ...user, role: nextRole, pending_kind: null }
          : user,
      ),
    );
  }

  async function rejectPendingUser(userId: string) {
    const confirmed = await confirm({
      title: "Aanmelding afwijzen",
      message: "Aanmelding afwijzen en account verwijderen?",
      confirmLabel: "Afwijzen",
      tone: "danger",
    });
    if (!confirmed) return;

    await onDeleteUser(userId, { skipConfirm: true });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds].filter((id) => id !== adminId);
    if (ids.length === 0) return;

    const adminTargets = ids.filter(
      (id) => users.find((user) => user.id === id)?.role === "admin",
    );

    let message = `Weet je zeker dat je ${ids.length} gebruiker${ids.length === 1 ? "" : "s"} permanent wilt verwijderen?`;
    if (adminTargets.length > 0) {
      message += `\n\nWaarschuwing: ${adminTargets.length} admin-account${adminTargets.length === 1 ? "" : "s"} worden ook verwijderd.`;
    }

    const confirmed = await confirm({
      title: "Gebruikers verwijderen",
      message,
      confirmLabel: "Verwijderen",
      tone: "danger",
    });
    if (!confirmed) return;

    for (const id of ids) {
      await onDeleteUser(id, { skipConfirm: true });
    }
    setSelectedIds(new Set());
  }

  async function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <div className="admin-tab-page">
      <AdminPageHeader
        title="Gebruikers"
        subtitle="Beheer alle platformgebruikers, rollen en coach-koppelingen."
        icon={Users}
        actions={
          <>
            <button
              type="button"
              className="admin-btn admin-btn--ghost w-full sm:w-auto"
              onClick={() =>
                showToast("Import volgt in een volgende iteratie.")
              }
            >
              <Upload className="h-4 w-4" />
              Importeren
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--ghost w-full sm:w-auto"
              onClick={() => exportUsersJson(filteredUsers)}
            >
              <Download className="h-4 w-4" />
              Exporteren
            </button>
            <Link
              href="/admin?tab=invites"
              className="admin-btn admin-btn--primary w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Gebruiker uitnodigen
            </Link>
          </>
        }
      />

      <div className="admin-summary-grid admin-summary-grid--4">
        <AdminSummaryCard
          label="Totaal"
          value={summary.total}
          icon={Users}
          tone="blue"
          trend={summary.totalTrend}
        />
        <AdminSummaryCard
          label="Coaches"
          value={summary.coachCount}
          icon={UserPlus}
          tone="green"
          trend={summary.coachTrend}
        />
        <AdminSummaryCard
          label="Atleten"
          value={summary.athleteCount}
          icon={Users}
          tone="purple"
          trend={summary.athleteTrend}
        />
        <AdminSummaryCard
          label="In afwachting"
          value={summary.pendingCount}
          icon={Users}
          tone="amber"
          trend={summary.pendingTrend}
        />
      </div>

      {unassignedCount > 0 ? (
        <p className="text-[13px] text-amber-200/90">
          {unassignedCount} atleet{unassignedCount === 1 ? "" : "en"} zonder
          coach —{" "}
          <Link
            href="/admin?tab=hierarchy"
            className="font-semibold underline-offset-2 hover:underline"
          >
            bekijk hiërarchie
          </Link>
        </p>
      ) : null}

      <AdminFilterBar>
        <div className="admin-search-wrap">
          <Search className="h-4 w-4 shrink-0 text-app-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek op naam of e-mail…"
            className="admin-search-input"
            aria-label="Zoek gebruikers"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="admin-select admin-toolbar-select"
          aria-label="Filter op rol"
        >
          <option value="all">Alle rollen</option>
          <option value="coach">Coaches</option>
          <option value="atleet">Atleten</option>
          <option value="pending">In afwachting</option>
          <option value="admin">Admins</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="admin-select admin-toolbar-select"
          aria-label="Filter op status"
        >
          <option value="all">Alle statussen</option>
          <option value="active">Actief</option>
          <option value="pending">In afwachting</option>
        </select>
        <select
          value={coachFilter}
          onChange={(event) => setCoachFilter(event.target.value)}
          className="admin-select admin-toolbar-select"
          aria-label="Filter op coach"
        >
          <option value="all">Alle coaches</option>
          <option value="none">Zonder coach</option>
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.full_name || coach.email || "Coach"}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowFilters((current) => !current)}
          className="admin-btn admin-btn--ghost admin-btn--sm"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </button>
      </AdminFilterBar>

      {showFilters ? (
        <AdminPanel className="!py-3">
          <p className="admin-muted text-[13px]">
            Combineer rol-, status- en coachfilters om snel de juiste gebruikers
            te vinden.
          </p>
        </AdminPanel>
      ) : null}

      <AdminPanel flush>
        <AdminTableToolbar
          left={
            <div className="flex flex-wrap items-center gap-3">
              <label className="admin-checkbox-row">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectAll}
                  aria-label="Selecteer alle gebruikers op deze pagina"
                />
                <span className="hidden sm:inline">Selecteer alles</span>
              </label>
              {selectedIds.size > 0 ? (
                <span className="text-app-muted">
                  {selectedIds.size} geselecteerd
                </span>
              ) : null}
              <select
                className="admin-select !min-h-[36px] !w-auto text-[12px]"
                disabled={selectedIds.size === 0}
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value === "delete") {
                    void handleBulkDelete();
                  }
                  event.target.value = "";
                }}
                aria-label="Bulk acties"
              >
                <option value="" disabled>
                  Bulk acties
                </option>
                <option value="delete">Verwijder geselecteerd</option>
              </select>
            </div>
          }
          right={
            <div className="flex items-center gap-2 text-app-muted">
              <span>{filteredUsers.length} resultaten</span>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="admin-btn admin-btn--ghost admin-btn--sm !min-h-[36px]"
                aria-label="Vernieuwen"
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          }
        />

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-10">
                  <span className="sr-only">Selecteer</span>
                </th>
                <th>Gebruiker</th>
                <th>Rol</th>
                <th className="admin-col-hide-sm">Coach</th>
                <th>Status</th>
                <th className="admin-col-hide-sm">Laatst actief</th>
                <th>
                  <span className="sr-only">Acties</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <p className="admin-empty">Geen gebruikers gevonden.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        disabled={user.id === adminId}
                        aria-label={`Selecteer ${user.full_name || user.email}`}
                        className="h-[18px] w-[18px] accent-[var(--admin-accent)]"
                      />
                    </td>
                    <td>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <AdminAvatar name={user.full_name} tone="blue" size="sm" />
                        <div className="min-w-0">
                          <p className="admin-strong truncate">
                            {user.full_name || "Naamloos"}
                          </p>
                          <p className="admin-subtle truncate text-[11px]">
                            {user.email || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <AdminRoleBadge
                        role={user.role}
                        pendingKind={user.pending_kind}
                      />
                    </td>
                    <td className="admin-col-hide-sm admin-muted">
                      {user.coach_name || "—"}
                    </td>
                    <td>
                      {user.role === "pending" ? (
                        <span className="admin-status-pill admin-status-pill--active !bg-amber-500/15 !text-amber-200">
                          In afwachting
                        </span>
                      ) : (
                        <span className="admin-status-pill admin-status-pill--active">
                          <span className="admin-status-dot admin-status-dot--active" />
                          Actief
                        </span>
                      )}
                    </td>
                    <td className="admin-col-hide-sm admin-muted">
                      {formatTimeAgo(user.created_at)}
                    </td>
                    <td>
                      <UserRowMenu
                        user={user}
                        adminId={adminId}
                        coaches={coaches}
                        onRoleChange={(userId, role) =>
                          void changeUserRole(userId, role)
                        }
                        onCoachAssign={(athleteId, coachId) =>
                          void assignAthleteToCoach(athleteId, coachId)
                        }
                        onDelete={(userId) => void onDeleteUser(userId)}
                        onApprovePending={(userId, pendingKind) =>
                          void approvePendingUser(userId, pendingKind)
                        }
                        onRejectPending={(userId) =>
                          void rejectPendingUser(userId)
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          page={page}
          pageSize={pageSize}
          total={filteredUsers.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </AdminPanel>
      <Toast message={toastMessage} onDismiss={clearToast} />
    </div>
  );
}
