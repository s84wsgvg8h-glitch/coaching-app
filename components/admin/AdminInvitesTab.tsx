"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Link2,
  Plus,
  Timer,
  UserPlus,
  Users,
} from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import {
  buildCoachInviteUrl,
  formatInviteExpiry,
  isInviteLinkExpired,
} from "@/lib/coachInviteLinks";
import {
  buildCoachSignupUrl,
  createCoachSignupInvite,
  formatInviteExpiry as formatSignupExpiry,
  type CoachSignupInvite,
} from "@/lib/coachSignupInvites";
import {
  buildPlatformInviteUrl,
  createAdminPlatformInvite,
  formatPlatformInviteExpiry,
  type AdminPlatformInvite,
} from "@/lib/adminPlatformInvites";
import {
  loadAdminInviteOverview,
  revokeAthleteInviteLink,
  revokeCoachSignupInvite,
  revokeAdminPlatformInvite,
  type AdminAthleteInvite,
} from "@/lib/adminInvites";
import { loadCoachOrganizations, type CoachOrganization } from "@/lib/adminOrganizations";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";
import { AdminLoading, AdminPanel } from "@/components/admin/AdminUi";
import {
  AdminEmptyPanel,
  AdminPageHeader,
  AdminPagination,
  AdminSummaryCard,
  formatDateNl,
} from "@/components/admin/AdminPageParts";

type AdminInvitesTabProps = {
  adminId: string;
};

type InviteKind = "coach" | "athlete" | "organization" | "solo-athlete";

type UnifiedInvite = {
  id: string;
  kind: InviteKind;
  name: string;
  url: string;
  token: string;
  owner: string;
  active: boolean;
  createdAt: string;
  expiresAt: string | null;
  expiresLabel: string;
};

type TypeFilter = "all" | "coach" | "athlete" | "organization";
type StatusFilter = "all" | "active" | "inactive";

function unifiedInviteIsExpired(item: UnifiedInvite) {
  if (!item.expiresAt) return false;
  return new Date(item.expiresAt).getTime() <= Date.now();
}

function inviteIsActive(item: UnifiedInvite) {
  return item.active && !unifiedInviteIsExpired(item);
}

export default function AdminInvitesTab({ adminId }: AdminInvitesTabProps) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState("");
  const [signupInvites, setSignupInvites] = useState<CoachSignupInvite[]>([]);
  const [athleteInvites, setAthleteInvites] = useState<AdminAthleteInvite[]>(
    [],
  );
  const [platformInvites, setPlatformInvites] = useState<AdminPlatformInvite[]>(
    [],
  );
  const [organizations, setOrganizations] = useState<CoachOrganization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function reload() {
    const [overview, orgs] = await Promise.all([
      loadAdminInviteOverview(),
      loadCoachOrganizations(),
    ]);
    setSignupInvites(overview.coachSignupInvites);
    setAthleteInvites(overview.athleteInvites);
    setPlatformInvites(overview.platformInvites);
    setOrganizations(orgs);
    if (!selectedOrganizationId && orgs[0]?.id) {
      setSelectedOrganizationId(orgs[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    deferEffectUpdate(() => {
      void reload();
    });
  }, []);

  const unifiedInvites = useMemo<UnifiedInvite[]>(() => {
    const coachItems: UnifiedInvite[] = signupInvites.map((invite) => ({
      id: invite.id,
      kind: "coach",
      name: invite.label?.trim() || "Coach signup-link",
      url: buildCoachSignupUrl(invite.token),
      token: invite.token,
      owner: "Platform",
      active: invite.active,
      createdAt: invite.created_at,
      expiresAt: invite.expires_at,
      expiresLabel: formatSignupExpiry(invite.expires_at),
    }));

    const athleteItems: UnifiedInvite[] = athleteInvites.map((invite) => ({
      id: invite.id,
      kind: "athlete",
      name: invite.label?.trim() || "Atleet uitnodiging",
      url: buildCoachInviteUrl(invite.token),
      token: invite.token,
      owner: invite.coach_name || "Onbekende coach",
      active: invite.active,
      createdAt: invite.created_at,
      expiresAt: invite.expires_at,
      expiresLabel: formatInviteExpiry(invite),
    }));

    const platformItems: UnifiedInvite[] = platformInvites.map((invite) => ({
      id: invite.id,
      kind: invite.invite_kind === "organization" ? "organization" : "solo-athlete",
      name:
        invite.label?.trim() ||
        (invite.invite_kind === "organization"
          ? "Organisatie uitnodiging"
          : "Atleet zonder coach"),
      url: buildPlatformInviteUrl(invite.token),
      token: invite.token,
      owner: "Platform admin",
      active: invite.active,
      createdAt: invite.created_at,
      expiresAt: invite.expires_at,
      expiresLabel: formatPlatformInviteExpiry(invite.expires_at),
    }));

    return [...coachItems, ...athleteItems, ...platformItems].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [signupInvites, athleteInvites, platformInvites]);

  const stats = useMemo(() => {
    const total = unifiedInvites.length;
    const coachLinks = unifiedInvites.filter((i) => i.kind === "coach").length;
    const athleteLinks = unifiedInvites.filter(
      (i) => i.kind === "athlete" || i.kind === "solo-athlete",
    ).length;
    const orgLinks = unifiedInvites.filter((i) => i.kind === "organization").length;
    const activeLinks = unifiedInvites.filter(inviteIsActive).length;
    const inactiveLinks = total - activeLinks;

    return { total, coachLinks, athleteLinks, orgLinks, activeLinks, inactiveLinks };
  }, [unifiedInvites]);

  const filteredInvites = useMemo(() => {
    const q = query.trim().toLowerCase();
    return unifiedInvites.filter((item) => {
      if (typeFilter !== "all") {
        if (
          typeFilter === "athlete" &&
          (item.kind === "athlete" || item.kind === "solo-athlete")
        ) {
          // include coach-atleet and solo-atleet links
        } else if (item.kind !== typeFilter) {
          return false;
        }
      }
      if (statusFilter === "active" && !inviteIsActive(item)) return false;
      if (statusFilter === "inactive" && inviteIsActive(item)) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.owner.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q)
      );
    });
  }, [unifiedInvites, typeFilter, statusFilter, query]);

  const paginatedInvites = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredInvites.slice(start, start + pageSize);
  }, [filteredInvites, page, pageSize]);

  useEffect(() => {
    deferEffectUpdate(() => {
      setPage(1);
    });
  }, [typeFilter, statusFilter, query, pageSize]);

  async function handleCreateCoachInvite() {
    if (!adminId) return;
    setCreating(true);
    const { data, error } = await createCoachSignupInvite(adminId);
    setCreating(false);

    if (error || !data) {
      alert(error?.message || "Link kon niet worden aangemaakt.");
      return;
    }

    setSignupInvites((current) => [data, ...current]);
  }

  async function handleCreateOrganizationInvite() {
    if (!adminId || !selectedOrganizationId) {
      alert("Kies eerst een organisatie.");
      return;
    }

    setCreating(true);
    const { data, error } = await createAdminPlatformInvite({
      createdBy: adminId,
      kind: "organization",
      organizationId: selectedOrganizationId,
    });
    setCreating(false);

    if (error || !data) {
      alert(error?.message || "Organisatielink kon niet worden aangemaakt.");
      return;
    }

    setPlatformInvites((current) => [data as AdminPlatformInvite, ...current]);
  }

  async function handleCreateSoloAthleteInvite() {
    if (!adminId) return;

    setCreating(true);
    const { data, error } = await createAdminPlatformInvite({
      createdBy: adminId,
      kind: "athlete",
      requiresIntake: true,
    });
    setCreating(false);

    if (error || !data) {
      alert(error?.message || "Atleetlink kon niet worden aangemaakt.");
      return;
    }

    setPlatformInvites((current) => [data as AdminPlatformInvite, ...current]);
  }

  async function copyUrl(url: string, token: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken(""), 2000);
    } catch {
      prompt("Kopieer deze link:", url);
    }
  }

  async function handleRevoke(item: UnifiedInvite) {
    if (!window.confirm("Uitnodigingslink intrekken?")) return;
    if (item.kind === "coach") {
      await revokeCoachSignupInvite(item.id);
    } else if (item.kind === "organization" || item.kind === "solo-athlete") {
      await revokeAdminPlatformInvite(item.id);
    } else {
      await revokeAthleteInviteLink(item.id);
    }
    void reload();
  }

  if (loading) {
    return <AdminLoading label="Uitnodigingen laden…" />;
  }

  return (
    <div className="admin-tab-page">
      <AdminPageHeader
        title="Uitnodigingen"
        subtitle="Beheer coach-, organisatie- en atleet-uitnodigingen."
        icon={Link2}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href="/admin/create-coach"
                className="admin-btn admin-btn--ghost w-full sm:w-auto"
              >
                <UserPlus className="h-4 w-4" />
                Coach aanmaken
              </Link>
              <button
                type="button"
                onClick={() => void handleCreateCoachInvite()}
                disabled={creating}
                className="admin-btn admin-btn--primary w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                {creating ? "Link maken…" : "Coach-link"}
              </button>
              <button
                type="button"
                onClick={() => void handleCreateSoloAthleteInvite()}
                disabled={creating}
                className="admin-btn admin-btn--ghost w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Atleet-link
              </button>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <select
                value={selectedOrganizationId}
                onChange={(event) => setSelectedOrganizationId(event.target.value)}
                className="admin-select w-full sm:min-w-[220px]"
                aria-label="Organisatie voor uitnodiging"
              >
                {organizations.length === 0 ? (
                  <option value="">Geen organisaties</option>
                ) : (
                  organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={() => void handleCreateOrganizationInvite()}
                disabled={creating || !selectedOrganizationId}
                className="admin-btn admin-btn--ghost w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Organisatie-link
              </button>
            </div>
          </div>
        }
      />

      <div className="admin-summary-grid admin-summary-grid--5">
        <AdminSummaryCard
          label="Totaal links"
          value={stats.total}
          icon={Link2}
          tone="blue"
        />
        <AdminSummaryCard
          label="Coach-links"
          value={stats.coachLinks}
          icon={UserPlus}
          tone="purple"
        />
        <AdminSummaryCard
          label="Atleet-links"
          value={stats.athleteLinks}
          icon={Users}
          tone="green"
        />
        <AdminSummaryCard
          label="Actieve links"
          value={stats.activeLinks}
          icon={Check}
          tone="amber"
        />
        <AdminSummaryCard
          label="Verlopen / inactief"
          value={stats.inactiveLinks}
          icon={Timer}
          tone="red"
        />
      </div>

      <AdminPanel flush className="min-w-0">
        <div className="admin-invite-tabs px-3 pt-2 sm:px-4">
          {(
            [
              { id: "all", label: "Alle links" },
              { id: "coach", label: "Coach-links" },
              { id: "organization", label: "Organisatie" },
              { id: "athlete", label: "Atleet-links" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`admin-invite-tab ${typeFilter === tab.id ? "is-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="border-b border-white/6 px-3 py-3 sm:px-4">
          <div className="admin-filter-bar !border-0 !bg-transparent !p-0">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Zoek op naam, eigenaar of link…"
              variant="rounded"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="admin-select admin-toolbar-select"
              aria-label="Filter op status"
            >
              <option value="all">Alle statussen</option>
              <option value="active">Actief</option>
              <option value="inactive">Verlopen / inactief</option>
            </select>
          </div>
        </div>

        {filteredInvites.length === 0 ? (
          <AdminEmptyPanel
            icon={Link2}
            title="Geen links gevonden"
            description={
              query || statusFilter !== "all" || typeFilter !== "all"
                ? "Pas je filters aan of maak een nieuwe coach-link aan."
                : "Maak een coach signup-link aan om coaches uit te nodigen."
            }
            action={
              <button
                type="button"
                onClick={() => void handleCreateCoachInvite()}
                disabled={creating}
                className="admin-btn admin-btn--primary"
              >
                <Plus className="h-4 w-4" />
                Nieuwe coach-link
              </button>
            }
          />
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Naam</th>
                    <th className="admin-col-hide-sm">Link</th>
                    <th className="admin-col-hide-sm">Eigenaar</th>
                    <th>Status</th>
                    <th className="admin-col-hide-sm">Aangemaakt</th>
                    <th className="admin-col-hide-sm">Verloopt</th>
                    <th>Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvites.map((item) => {
                    const active = inviteIsActive(item);
                    const copied = copiedToken === item.token;

                    return (
                      <tr key={`${item.kind}-${item.id}`}>
                        <td>
                          <span
                            className={`admin-badge ${
                              item.kind === "coach"
                                ? "admin-badge--coach"
                                : item.kind === "organization"
                                  ? "admin-badge--admin"
                                  : "admin-badge--athlete"
                            }`}
                          >
                            {item.kind === "coach"
                              ? "Coach"
                              : item.kind === "organization"
                                ? "Organisatie"
                                : "Atleet"}
                          </span>
                        </td>
                        <td>
                          <p className="admin-strong max-w-[160px] truncate sm:max-w-none">
                            {item.name}
                          </p>
                          <p className="admin-col-hide-sm mt-1 hidden text-[11px] admin-subtle sm:block">
                            {item.url}
                          </p>
                        </td>
                        <td className="admin-col-hide-sm">
                          <div className="admin-link-cell max-w-[240px]">
                            <span className="min-w-0 flex-1 truncate">
                              {item.url.replace(/^https?:\/\//, "")}
                            </span>
                            <button
                              type="button"
                              onClick={() => void copyUrl(item.url, item.token)}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-hover hover:text-app-text"
                              aria-label="Link kopiëren"
                            >
                              {copied ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="admin-col-hide-sm text-[13px] admin-muted">
                          {item.owner}
                        </td>
                        <td>
                          <span className="inline-flex items-center text-[12px] font-semibold">
                            <span
                              className={`admin-status-dot ${
                                active
                                  ? "admin-status-dot--active"
                                  : unifiedInviteIsExpired(item)
                                    ? "admin-status-dot--warning"
                                    : "admin-status-dot--inactive"
                              }`}
                            />
                            {active
                              ? "Actief"
                              : unifiedInviteIsExpired(item)
                                ? "Verlopen"
                                : "Inactief"}
                          </span>
                        </td>
                        <td className="admin-col-hide-sm text-[13px] admin-muted">
                          {formatDateNl(item.createdAt)}
                        </td>
                        <td className="admin-col-hide-sm text-[13px] admin-muted">
                          {item.expiresLabel}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => void copyUrl(item.url, item.token)}
                              className="admin-btn admin-btn--ghost admin-btn--sm"
                            >
                              {copied ? "Gekopieerd" : "Kopiëren"}
                            </button>
                            {active ? (
                              <button
                                type="button"
                                onClick={() => void handleRevoke(item)}
                                className="admin-btn admin-btn--danger admin-btn--sm"
                              >
                                Intrekken
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={filteredInvites.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </AdminPanel>
    </div>
  );
}
