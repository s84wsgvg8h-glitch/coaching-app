"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Crown,
  MoreHorizontal,
  Percent,
  Plus,
  Search,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  assignCoachOrganization,
  assignOrganizationHeadCoach,
  createCoachOrganization,
  deleteCoachOrganization,
  loadCoachOrganizations,
  slugifyOrgName,
  type CoachOrganization,
} from "@/lib/adminOrganizations";
import type { AdminUser } from "@/components/admin/AdminUsersTab";
import { AdminLoading, AdminPanel } from "@/components/admin/AdminUi";
import {
  AdminAvatar,
  AdminEmptyPanel,
  AdminFilterBar,
  AdminPageHeader,
  AdminPagination,
  AdminSummaryCard,
  formatDateNl,
  getInitials,
} from "@/components/admin/AdminPageParts";

type AdminOrganizationsTabProps = {
  users: AdminUser[];
  onReload: () => Promise<void>;
};

type SortDir = "asc" | "desc";

function orgStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "active" || normalized === "trialing") {
    return { label: "Actief", tone: "success" as const };
  }
  if (normalized === "canceled" || normalized === "cancelled") {
    return { label: "Geannuleerd", tone: "danger" as const };
  }
  if (normalized === "past_due") {
    return { label: "Achterstallig", tone: "warning" as const };
  }
  return { label: status || "Onbekend", tone: "neutral" as const };
}

export default function AdminOrganizationsTab({
  users,
  onReload,
}: AdminOrganizationsTabProps) {
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<CoachOrganization[]>([]);
  const [coachOrgMap, setCoachOrgMap] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [menuOrgId, setMenuOrgId] = useState<string | null>(null);

  const coaches = useMemo(
    () => users.filter((user) => user.role === "coach"),
    [users],
  );

  const coachById = useMemo(
    () => new Map(coaches.map((coach) => [coach.id, coach])),
    [coaches],
  );

  const coachesByOrg = useMemo(() => {
    const map = new Map<string, AdminUser[]>();
    for (const coach of coaches) {
      const orgId = coachOrgMap[coach.id];
      if (!orgId) continue;
      const list = map.get(orgId) || [];
      list.push(coach);
      map.set(orgId, list);
    }
    return map;
  }, [coaches, coachOrgMap]);

  async function reloadOrgs() {
    setOrgs(await loadCoachOrganizations());

    const { data } = await supabase
      .from("profiles")
      .select("id, organization_id")
      .eq("role", "coach");

    const map: Record<string, string> = {};
    for (const row of data || []) {
      if (row.organization_id) {
        map[row.id] = row.organization_id;
      }
    }
    setCoachOrgMap(map);
    setLoading(false);
  }

  useEffect(() => {
    void reloadOrgs();
  }, []);

  const stats = useMemo(() => {
    const total = orgs.length;
    const headAssigned = orgs.filter((org) => org.head_coach_id).length;
    const coachesTotal = coaches.filter((c) => coachOrgMap[c.id]).length;
    const orgsWithCoaches = orgs.filter(
      (org) => (coachesByOrg.get(org.id)?.length || 0) > 0,
    ).length;
    const orgsWithoutCoaches = total - orgsWithCoaches;
    const withCoachesPct =
      total === 0 ? 0 : Math.round((orgsWithCoaches / total) * 100);

    return {
      total,
      headAssigned,
      coachesTotal,
      withCoachesPct,
      orgsWithoutCoaches,
    };
  }, [orgs, coaches, coachOrgMap, coachesByOrg]);

  const filteredOrgs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orgs
      .filter((org) => {
        if (statusFilter !== "all") {
          const status = org.subscription_status.toLowerCase();
          if (statusFilter === "active") {
            if (status !== "active" && status !== "trialing") return false;
          } else if (statusFilter === "inactive") {
            if (status === "active" || status === "trialing") return false;
          } else if (status !== statusFilter) {
            return false;
          }
        }
        if (!q) return true;
        return (
          org.name.toLowerCase().includes(q) ||
          org.slug.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const cmp = a.name.localeCompare(b.name, "nl");
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [orgs, query, statusFilter, sortDir]);

  const paginatedOrgs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrgs.slice(start, start + pageSize);
  }, [filteredOrgs, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, sortDir, pageSize]);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    const { error } = await createCoachOrganization(
      name,
      slug.trim() || undefined,
    );
    setCreating(false);

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setSlug("");
    setShowCreate(false);
    void reloadOrgs();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Organisatie verwijderen?")) return;
    setMenuOrgId(null);
    const { error } = await deleteCoachOrganization(id);
    if (error) alert(error.message);
    else {
      if (expandedOrgId === id) setExpandedOrgId(null);
      void reloadOrgs();
      void onReload();
    }
  }

  async function handleHeadCoachChange(orgId: string, coachId: string | null) {
    await assignOrganizationHeadCoach(orgId, coachId);
    setMenuOrgId(null);
    void reloadOrgs();
    void onReload();
  }

  async function handleCoachOrgChange(
    coachId: string,
    orgId: string | null,
  ) {
    setCoachOrgMap((current) => {
      const next = { ...current };
      if (orgId) next[coachId] = orgId;
      else delete next[coachId];
      return next;
    });
    await assignCoachOrganization(coachId, orgId);
    void onReload();
  }

  if (loading) {
    return <AdminLoading label="Organisaties laden…" />;
  }

  return (
    <div className="admin-tab-page">
      <AdminPageHeader
        title="Organisaties"
        subtitle="Beheer coach-organisaties, head coaches en teamtoewijzingen."
        icon={Building2}
        actions={
          <button
            type="button"
            onClick={() => setShowCreate((current) => !current)}
            className="admin-btn admin-btn--primary w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Organisatie aanmaken
          </button>
        }
      />

      {showCreate ? (
        <AdminPanel>
          <h2 className="admin-section-title text-base">Nieuwe organisatie</h2>
          <p className="mt-1 text-[13px] admin-muted">
            Maak een organisatie aan met een unieke slug.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slug) setSlug(slugifyOrgName(event.target.value));
              }}
              placeholder="Naam"
              className="admin-input sm:min-w-[200px] sm:flex-1"
            />
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="slug"
              className="admin-input sm:min-w-[160px] sm:flex-1"
            />
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating || !name.trim()}
                className="admin-btn admin-btn--primary w-full sm:w-auto"
              >
                {creating ? "Aanmaken…" : "Aanmaken"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setName("");
                  setSlug("");
                }}
                className="admin-btn admin-btn--ghost w-full sm:w-auto"
              >
                Annuleren
              </button>
            </div>
          </div>
        </AdminPanel>
      ) : null}

      <div className="admin-summary-grid admin-summary-grid--5">
        <AdminSummaryCard
          label="Organisaties"
          value={stats.total}
          icon={Building2}
          tone="blue"
        />
        <AdminSummaryCard
          label="Head coaches"
          value={stats.headAssigned}
          subtext="Toegewezen"
          icon={Crown}
          tone="purple"
        />
        <AdminSummaryCard
          label="Coaches totaal"
          value={stats.coachesTotal}
          subtext="In organisaties"
          icon={Users}
          tone="green"
        />
        <AdminSummaryCard
          label="Met coaches"
          value={`${stats.withCoachesPct}%`}
          icon={Percent}
          tone="amber"
        />
        <AdminSummaryCard
          label="Zonder coaches"
          value={stats.orgsWithoutCoaches}
          icon={UserX}
          tone="red"
        />
      </div>

      <AdminFilterBar>
        <div className="admin-search-wrap">
          <Search className="h-4 w-4 shrink-0 text-app-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek op naam of slug…"
            className="admin-search-input"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="admin-select admin-toolbar-select"
          aria-label="Filter op status"
        >
          <option value="all">Alle statussen</option>
          <option value="active">Actief</option>
          <option value="inactive">Inactief</option>
          <option value="past_due">Achterstallig</option>
          <option value="canceled">Geannuleerd</option>
        </select>
        <select
          value={sortDir}
          onChange={(event) => setSortDir(event.target.value as SortDir)}
          className="admin-select admin-toolbar-select"
          aria-label="Sorteer op naam"
        >
          <option value="asc">Naam A–Z</option>
          <option value="desc">Naam Z–A</option>
        </select>
      </AdminFilterBar>

      <AdminPanel flush className="min-w-0">
        {filteredOrgs.length === 0 ? (
          <AdminEmptyPanel
            icon={Building2}
            title="Geen organisaties gevonden"
            description={
              query || statusFilter !== "all"
                ? "Pas je filters aan of maak een nieuwe organisatie aan."
                : "Maak je eerste organisatie aan om coaches te groeperen."
            }
            action={
              !showCreate ? (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="admin-btn admin-btn--primary"
                >
                  <Plus className="h-4 w-4" />
                  Organisatie aanmaken
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Naam</th>
                    <th className="admin-col-hide-sm">Head coach</th>
                    <th>Coaches</th>
                    <th className="admin-col-hide-sm">Status</th>
                    <th className="admin-col-hide-sm">Aangemaakt</th>
                    <th>
                      <span className="sr-only">Acties</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrgs.map((org) => {
                    const headCoach = org.head_coach_id
                      ? coachById.get(org.head_coach_id)
                      : null;
                    const orgCoaches = coachesByOrg.get(org.id) || [];
                    const status = orgStatusLabel(org.subscription_status);
                    const isExpanded = expandedOrgId === org.id;
                    const menuOpen = menuOrgId === org.id;

                    return (
                      <Fragment key={org.id}>
                        <tr>
                          <td>
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="admin-org-avatar admin-org-avatar--blue">
                                {getInitials(org.name)}
                              </span>
                              <div className="min-w-0">
                                <p className="admin-strong truncate">
                                  {org.name}
                                </p>
                                <p className="truncate text-[12px] admin-subtle">
                                  {org.slug}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="admin-col-hide-sm">
                            {headCoach ? (
                              <div className="flex items-center gap-2">
                                <AdminAvatar
                                  name={headCoach.full_name || headCoach.email}
                                  tone="purple"
                                  size="sm"
                                />
                                <span className="truncate text-[13px]">
                                  {headCoach.full_name || headCoach.email}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[13px] admin-muted">
                                Niet toegewezen
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrgId(isExpanded ? null : org.id)
                              }
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-[#93c5fd] hover:bg-white/5"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              {orgCoaches.length}
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                          <td className="admin-col-hide-sm">
                            <span
                              className={`admin-badge ${
                                status.tone === "success"
                                  ? "admin-badge--success"
                                  : status.tone === "danger"
                                    ? "admin-badge--danger"
                                    : status.tone === "warning"
                                      ? "admin-badge--warning"
                                      : ""
                              }`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="admin-col-hide-sm text-[13px] admin-muted">
                            {formatDateNl(org.created_at)}
                          </td>
                          <td>
                            <details
                              className="admin-row-menu"
                              open={menuOpen}
                              onToggle={(event) => {
                                const open = (
                                  event.currentTarget as HTMLDetailsElement
                                ).open;
                                setMenuOrgId(open ? org.id : null);
                              }}
                            >
                              <summary aria-label="Acties">
                                <MoreHorizontal className="h-4 w-4" />
                              </summary>
                              <div className="admin-row-menu-panel">
                                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-app-subtle">
                                  Head coach
                                </p>
                                <select
                                  value={org.head_coach_id || ""}
                                  onChange={(event) => {
                                    const coachId =
                                      event.target.value || null;
                                    void handleHeadCoachChange(org.id, coachId);
                                  }}
                                  className="admin-select mb-1 !min-h-[36px] text-[12px]"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <option value="">Geen head coach</option>
                                  {coaches
                                    .filter(
                                      (coach) =>
                                        coachOrgMap[coach.id] === org.id ||
                                        !coachOrgMap[coach.id],
                                    )
                                    .map((coach) => (
                                      <option key={coach.id} value={coach.id}>
                                        {coach.full_name || coach.email}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(org.id)}
                                  className="admin-row-menu-item admin-row-menu-item--danger"
                                >
                                  Organisatie verwijderen
                                </button>
                              </div>
                            </details>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr key={`${org.id}-coaches`}>
                            <td colSpan={6} className="!bg-black/20">
                              <div className="py-2">
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-app-subtle">
                                  Coaches in {org.name}
                                </p>
                                {orgCoaches.length === 0 ? (
                                  <p className="text-[13px] admin-muted">
                                    Nog geen coaches toegewezen.
                                  </p>
                                ) : (
                                  <ul className="space-y-2">
                                    {orgCoaches.map((coach) => (
                                      <li
                                        key={coach.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2"
                                      >
                                        <div className="flex items-center gap-2">
                                          <AdminAvatar
                                            name={
                                              coach.full_name || coach.email
                                            }
                                            tone="green"
                                            size="sm"
                                          />
                                          <span className="text-[13px]">
                                            {coach.full_name || coach.email}
                                          </span>
                                          {org.head_coach_id === coach.id ? (
                                            <span className="admin-badge admin-badge--coach">
                                              Head coach
                                            </span>
                                          ) : null}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleCoachOrgChange(
                                              coach.id,
                                              null,
                                            )
                                          }
                                          className="admin-btn admin-btn--ghost admin-btn--sm"
                                        >
                                          Ontkoppelen
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <label className="sr-only" htmlFor={`assign-${org.id}`}>
                                    Coach toewijzen
                                  </label>
                                  <select
                                    id={`assign-${org.id}`}
                                    defaultValue=""
                                    onChange={(event) => {
                                      const coachId = event.target.value;
                                      if (!coachId) return;
                                      void handleCoachOrgChange(coachId, org.id);
                                      event.target.value = "";
                                    }}
                                    className="admin-select sm:max-w-xs"
                                  >
                                    <option value="">Coach toevoegen…</option>
                                    {coaches
                                      .filter(
                                        (coach) =>
                                          coachOrgMap[coach.id] !== org.id,
                                      )
                                      .map((coach) => (
                                        <option key={coach.id} value={coach.id}>
                                          {coach.full_name || coach.email}
                                          {coachOrgMap[coach.id]
                                            ? " (verplaatsen)"
                                            : ""}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={filteredOrgs.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </AdminPanel>
    </div>
  );
}
