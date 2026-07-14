"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Download,
  GitBranch,
  LayoutList,
  MoreHorizontal,
  Shield,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import { supabase } from "@/lib/supabaseClient";
import {
  buildPlatformHierarchy,
  type HierarchyNode,
  type PlatformHierarchy,
} from "@/lib/adminHierarchy";
import {
  loadCoachOrganizations,
  type CoachOrganization,
} from "@/lib/adminOrganizations";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";
import type { AdminUser } from "@/components/admin/AdminUsersTab";
import {
  AdminAvatar,
  AdminFilterBar,
  AdminPageHeader,
  AdminSummaryCard,
} from "@/components/admin/AdminPageParts";
import { AdminLoading, AdminPanel } from "@/components/admin/AdminUi";

type AdminHierarchyTabProps = {
  users: AdminUser[];
};

type ViewMode = "tree" | "list";

function nodeMatchesSearch(node: HierarchyNode, query: string) {
  const haystack = [node.name, node.subtitle, node.badge]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function matchesRoleFilter(node: HierarchyNode, roleFilter: string) {
  if (roleFilter === "all") return true;
  if (roleFilter === "organization") return node.type === "organization";
  if (roleFilter === "coach") return node.type === "coach";
  if (roleFilter === "atleet") return node.type === "athlete";
  if (roleFilter === "admin") return node.type === "admin";
  if (roleFilter === "platform") return node.type === "platform";
  return true;
}

function nodeInOrgBranch(
  node: HierarchyNode,
  orgId: string,
  parentOrgId: string | null,
): boolean {
  const currentOrgId =
    node.type === "organization" && node.id !== "independent-coaches"
      ? node.id
      : parentOrgId;

  if (currentOrgId === orgId) return true;
  return (
    node.children?.some((child) =>
      nodeInOrgBranch(child, orgId, currentOrgId),
    ) ?? false
  );
}

function filterHierarchyTree(
  node: HierarchyNode,
  query: string,
  roleFilter: string,
  orgFilter: string,
  parentOrgId: string | null = null,
): HierarchyNode | null {
  const q = query.trim().toLowerCase();
  const currentOrgId =
    node.type === "organization" &&
    !["independent-coaches", "orphan-athletes", "pending-users"].includes(
      node.id,
    )
      ? node.id
      : parentOrgId;

  const filteredChildren = (node.children || [])
    .map((child) =>
      filterHierarchyTree(child, query, roleFilter, orgFilter, currentOrgId),
    )
    .filter((child): child is HierarchyNode => child !== null);

  const searchMatch = !q || nodeMatchesSearch(node, q);
  const roleMatch = matchesRoleFilter(node, roleFilter);
  const orgMatch =
    orgFilter === "all" ||
    (node.type === "organization" && node.id === orgFilter) ||
    (currentOrgId === orgFilter && node.type !== "platform") ||
    nodeInOrgBranch(node, orgFilter, null);

  const selfVisible = searchMatch && roleMatch && orgMatch;

  if (selfVisible || filteredChildren.length > 0) {
    return {
      ...node,
      children:
        filteredChildren.length > 0
          ? filteredChildren
          : selfVisible
            ? node.children
            : undefined,
    };
  }

  return null;
}

function flattenHierarchy(
  node: HierarchyNode,
  depth = 0,
  acc: Array<{ node: HierarchyNode; depth: number }> = [],
) {
  acc.push({ node, depth });
  for (const child of node.children || []) {
    flattenHierarchy(child, depth + 1, acc);
  }
  return acc;
}

function getNodeAvatarTone(
  node: HierarchyNode,
): "blue" | "green" | "purple" | "amber" {
  if (node.type === "admin" || node.type === "platform") return "purple";
  if (node.type === "coach") return "green";
  if (node.type === "athlete") return "blue";
  return "amber";
}

function HierarchyNodeBadges({ node }: { node: HierarchyNode }) {
  const badges: Array<{ label: string; className: string }> = [];

  if (node.type === "platform") {
    badges.push({ label: "Superadmin", className: "admin-badge--admin" });
  }
  if (node.type === "admin") {
    badges.push({ label: "Superadmin", className: "admin-badge--admin" });
  }
  if (node.badge === "Head") {
    badges.push({ label: "Head coach", className: "admin-badge--coach" });
  }
  if (node.type === "athlete") {
    badges.push({ label: "Atleet", className: "admin-badge--athlete" });
  }
  if (
    node.badge &&
    node.badge !== "Head" &&
    node.badge !== "Orphan" &&
    node.badge !== "Pending" &&
    node.badge !== "Actie"
  ) {
    badges.push({ label: node.badge, className: "admin-badge--warning" });
  }
  if (node.badge === "Pending") {
    badges.push({ label: "Trial", className: "admin-badge--pending" });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {badges.map((badge) => (
        <span key={badge.label} className={`admin-badge ${badge.className}`}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}

function HierarchyTreeNodeV2({
  node,
  depth = 0,
  defaultOpen = depth < 2,
  forceOpen = false,
}: {
  node: HierarchyNode;
  depth?: number;
  defaultOpen?: boolean;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || forceOpen);
  const hasChildren = Boolean(node.children?.length);

  useEffect(() => {
    if (forceOpen) {
      deferEffectUpdate(() => {
        setOpen(true);
      });
    }
  }, [forceOpen]);

  const isOrg =
    node.type === "organization" &&
    !["independent-coaches", "orphan-athletes", "pending-users"].includes(
      node.id,
    );

  return (
    <li className="admin-hierarchy-item">
      <div
        className="admin-hierarchy-node-v2"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="admin-hierarchy-toggle app-focus-ring"
            aria-expanded={open}
            aria-label={open ? "Inklappen" : "Uitklappen"}
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="admin-hierarchy-toggle-spacer" />
        )}

        {isOrg ? (
          <span className="admin-org-avatar admin-org-avatar--blue">
            <Building2 className="h-4 w-4" />
          </span>
        ) : (
          <AdminAvatar
            name={node.name}
            tone={getNodeAvatarTone(node)}
            size="sm"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="admin-hierarchy-name">{node.name}</p>
            <HierarchyNodeBadges node={node} />
          </div>
          {node.subtitle ? (
            <p className="admin-hierarchy-subtitle">{node.subtitle}</p>
          ) : null}
        </div>

        <details className="admin-row-menu">
          <summary aria-label={`Acties voor ${node.name}`}>
            <MoreHorizontal className="h-4 w-4" />
          </summary>
          <div className="admin-row-menu-panel">
            {node.href ? (
              <Link href={node.href} className="admin-row-menu-item">
                Bekijken
              </Link>
            ) : (
              <button type="button" className="admin-row-menu-item" disabled>
                Acties binnenkort
              </button>
            )}
          </div>
        </details>
      </div>

      {hasChildren && open ? (
        <ul className={`admin-hierarchy-children ${depth >= 0 ? "admin-hierarchy-connector" : ""}`}>
          {node.children!.map((child) => (
            <HierarchyTreeNodeV2
              key={child.id}
              node={child}
              depth={depth + 1}
              defaultOpen={depth < 1}
              forceOpen={forceOpen}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function exportHierarchyJson(hierarchy: PlatformHierarchy) {
  const blob = new Blob([JSON.stringify(hierarchy, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `limitless-hierarchy-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AdminHierarchyTab({ users }: AdminHierarchyTabProps) {
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<CoachOrganization[]>([]);
  const [coachOrgMap, setCoachOrgMap] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  useEffect(() => {
    async function load() {
      const loadedOrgs = await loadCoachOrganizations();
      setOrgs(loadedOrgs);

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

    void load();
  }, []);

  const hierarchy = useMemo(
    () => buildPlatformHierarchy(users, orgs, coachOrgMap),
    [users, orgs, coachOrgMap],
  );

  const activeOrgs = useMemo(
    () => orgs.filter((org) => org.subscription_status === "active").length,
    [orgs],
  );

  const filteredRoot = useMemo(() => {
    const filtered = filterHierarchyTree(
      hierarchy.root,
      query,
      roleFilter,
      orgFilter,
    );
    return filtered || hierarchy.root;
  }, [hierarchy.root, query, roleFilter, orgFilter]);

  const flatNodes = useMemo(
    () => flattenHierarchy(filteredRoot),
    [filteredRoot],
  );

  const hasActiveFilters =
    query.trim() !== "" || roleFilter !== "all" || orgFilter !== "all";

  if (loading) {
    return <AdminLoading label="Hiërarchie laden…" />;
  }

  return (
    <div className="admin-tab-page">
      <AdminPageHeader
        title="Hiërarchie"
        subtitle="Overzicht van de volledige organisatiestructuur: platform, organisaties, coaches en atleten."
        icon={GitBranch}
        breadcrumbs={[
          { label: "Admin", href: "/admin?tab=overview" },
          { label: "Organisaties", href: "/admin?tab=organizations" },
          { label: "Coaches", href: "/admin?tab=coaches" },
          { label: "Atleten" },
        ]}
        actions={
          <>
            <Link
              href="/admin?tab=organizations"
              className="admin-btn admin-btn--ghost w-full sm:w-auto"
            >
              Organisaties beheren
            </Link>
            <button
              type="button"
              onClick={() => exportHierarchyJson(hierarchy)}
              className="admin-btn admin-btn--primary w-full sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Exporteren
            </button>
          </>
        }
      />

      <div className="admin-summary-grid admin-summary-grid--4">
        <AdminSummaryCard
          label="Organisaties"
          value={hierarchy.stats.organizations}
          subtext={`${activeOrgs} actief`}
          icon={Building2}
          tone="blue"
        />
        <AdminSummaryCard
          label="Coaches"
          value={hierarchy.stats.coaches}
          subtext={`${hierarchy.stats.independentCoaches} zelfstandig`}
          icon={UserRound}
          tone="green"
        />
        <AdminSummaryCard
          label="Atleten"
          value={hierarchy.stats.athletes}
          subtext={`${hierarchy.stats.unassignedAthletes} zonder coach`}
          icon={Users}
          tone="purple"
        />
        <AdminSummaryCard
          label="Admins"
          value={hierarchy.stats.admins}
          subtext="platformbeheer"
          icon={Shield}
          tone="amber"
        />
      </div>

      {(hierarchy.stats.unassignedAthletes > 0 ||
        hierarchy.stats.pendingCoaches > 0) && (
        <AdminPanel className="admin-alert-banner !py-3">
          <p className="text-[13px] text-amber-100/90">
            {hierarchy.stats.unassignedAthletes > 0 ? (
              <>
                <Link
                  href="/admin?tab=users"
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  {hierarchy.stats.unassignedAthletes} atleten zonder coach
                </Link>
                {hierarchy.stats.pendingCoaches > 0 ? " · " : null}
              </>
            ) : null}
            {hierarchy.stats.pendingCoaches > 0 ? (
              <Link
                href="/admin?tab=coaches"
                className="font-semibold underline-offset-2 hover:underline"
              >
                {hierarchy.stats.pendingCoaches} coach-aanmeldingen
              </Link>
            ) : null}
          </p>
        </AdminPanel>
      )}

      <AdminFilterBar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Zoek op naam, e-mail of rol…"
          variant="rounded"
          aria-label="Zoek in hiërarchie"
        />
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="admin-select admin-toolbar-select"
          aria-label="Filter op rol"
        >
          <option value="all">Alle rollen</option>
          <option value="organization">Organisaties</option>
          <option value="coach">Coaches</option>
          <option value="atleet">Atleten</option>
          <option value="admin">Admins</option>
        </select>
        <select
          value={orgFilter}
          onChange={(event) => setOrgFilter(event.target.value)}
          className="admin-select admin-toolbar-select"
          aria-label="Filter op organisatie"
        >
          <option value="all">Alle organisaties</option>
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowMoreFilters((current) => !current)}
          className="admin-btn admin-btn--ghost admin-btn--sm"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Meer filters
        </button>
        <div className="admin-view-toggle ml-auto">
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            className={`admin-view-toggle-btn app-focus-ring ${viewMode === "tree" ? "is-active" : ""}`}
            aria-label="Boomweergave"
            aria-pressed={viewMode === "tree"}
          >
            <GitBranch className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`admin-view-toggle-btn app-focus-ring ${viewMode === "list" ? "is-active" : ""}`}
            aria-label="Lijstweergave"
            aria-pressed={viewMode === "list"}
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </AdminFilterBar>

      {showMoreFilters ? (
        <AdminPanel className="!py-3">
          <p className="admin-muted text-[13px]">
            Gebruik de rol- en organisatiefilters hierboven. Extra filters (status,
            head coach) volgen in een volgende iteratie.
          </p>
        </AdminPanel>
      ) : null}

      <AdminPanel flush className="admin-hierarchy-panel">
        {viewMode === "tree" ? (
          <ul className="admin-hierarchy-tree">
            <HierarchyTreeNodeV2
              node={filteredRoot}
              defaultOpen
              forceOpen={hasActiveFilters}
            />
          </ul>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th className="admin-col-hide-sm">Type</th>
                  <th className="admin-col-hide-sm">Details</th>
                  <th>Badges</th>
                </tr>
              </thead>
              <tbody>
                {flatNodes.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <p className="admin-empty">Geen resultaten gevonden.</p>
                    </td>
                  </tr>
                ) : (
                  flatNodes.map(({ node, depth }) => (
                    <tr key={`${node.id}-${depth}`}>
                      <td>
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${depth * 12}px` }}
                        >
                          <AdminAvatar
                            name={node.name}
                            tone={getNodeAvatarTone(node)}
                            size="sm"
                          />
                          <span className="admin-strong">{node.name}</span>
                        </div>
                      </td>
                      <td className="admin-col-hide-sm admin-muted capitalize">
                        {node.type}
                      </td>
                      <td className="admin-col-hide-sm admin-muted">
                        {node.subtitle || "—"}
                      </td>
                      <td>
                        <HierarchyNodeBadges node={node} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
