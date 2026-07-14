"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, Download, Archive, RotateCcw } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import Toast, { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import AthleteMetricBar from "@/components/coach/athletes/AthleteMetricBar";
import AthletesFilterTabs, {
  type AthletesQuickFilter,
} from "@/components/coach/athletes/AthletesFilterTabs";
import AthletesHeader from "@/components/coach/athletes/AthletesHeader";
import AthletesSearchBar from "@/components/coach/athletes/AthletesSearchBar";
import { athletesGlassCard } from "@/components/coach/athletes/athletesCrmClasses";
import AthleteOverviewDesktopRow, {
  AthleteOverviewMobileCard,
  AthleteOverviewTableColGroup,
  AthleteOverviewTableHead,
} from "@/components/coach/AthleteOverviewStackCard";
import { supabase } from "@/lib/supabaseClient";
import { isAdminRole, isCoachLikeRole } from "@/lib/authRoles";
import {
  buildMonthlyPaymentHistory,
  formatPaymentPrice,
  formatPaymentPriceCompact,
  loadTotalAthleteIncome,
} from "@/lib/athletePayments";
import {
  enrichCoachAthleteOverviewRows,
  loadCoachAthleteOverviewBasic,
  type CoachAthleteOverviewRow,
} from "@/lib/coachAthleteOverview";
import {
  getCurrentMonthDayNumbers,
  getCurrentMonthTodayDay,
  loadAthleteOverviewDailyTracking,
  type AthleteDailyTrackingRow,
} from "@/lib/athleteOverviewDailyTracking";
import { downloadAthleteOverviewCsv } from "@/lib/athleteOverviewCsv";
import {
  loadArchivedAthletesForCoach,
  removeAthleteFromOrganization,
  restoreAthleteForCoach,
  syncAthleteOrganizationFromCoach,
} from "@/lib/orgAthleteScope";
import {
  loadAthleteLastActivities,
  type AthleteLastActivity,
} from "@/lib/athleteLastActivity";
import {
  getAthleteStatus,
  getAthleteStatusMeta,
  type AthleteStatus,
} from "@/lib/athleteStatus";

type SortKey =
  | "name"
  | "status"
  | "fillScore"
  | "birthDate"
  | "lidnummer"
  | "price"
  | "paymentDay"
  | "weeksOut"
  | "lastActivity";

type SortDir = "asc" | "desc";
type QuickFilter = AthletesQuickFilter;

export type { AthleteOverviewExportColumn as ColumnKey } from "@/lib/athleteOverviewCsv";

function isAthleteBehind(
  row: CoachAthleteOverviewRow,
  status: AthleteStatus,
) {
  return status !== "active" || row.fillScore < 70;
}

function titleCaseName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function athleteHandle(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return `@${slug || "atleet"}`;
}

type ArchivedAthleteRow = {
  id: string;
  fullName: string;
  archivedAt: string | null;
  betalingPrijs: number | null;
};

type PendingProfile = {
  id: string;
  fullName: string;
};

type AthleteOverviewPanelProps = {
  hideExportButton?: boolean;
  onExportContext?: (context: {
    download: () => void;
    disabled: boolean;
  }) => void;
  onInviteClick?: () => void;
};

export default function AthleteOverviewPanel({
  hideExportButton = false,
  onExportContext,
  onInviteClick,
}: AthleteOverviewPanelProps = {}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { message: toastMessage, showToast, clearToast } = useToast();
  const [coachId, setCoachId] = useState("");
  const [coachRole, setCoachRole] = useState("");
  const [rows, setRows] = useState<CoachAthleteOverviewRow[]>([]);
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [dailyTrackingByAthlete, setDailyTrackingByAthlete] = useState<
    Map<string, AthleteDailyTrackingRow>
  >(new Map());
  const [lastActivityByAthlete, setLastActivityByAthlete] = useState<
    Map<string, AthleteLastActivity>
  >(new Map());
  const [totalIncome, setTotalIncome] = useState<number | null>(null);
  const [archivedRows, setArchivedRows] = useState<ArchivedAthleteRow[]>([]);
  const pendingBannerRef = useRef<HTMLDivElement | null>(null);
  const daysInMonth = getCurrentMonthDayNumbers();
  const todayDay = getCurrentMonthTodayDay();

  const getRowStatus = useCallback(
    (row: CoachAthleteOverviewRow): AthleteStatus => {
      const days = lastActivityByAthlete.get(row.id)?.daysAgo ?? null;
      return getAthleteStatus(days, row.fillScore);
    },
    [lastActivityByAthlete],
  );

  async function reloadRows(viewerId: string, role: string) {
    const basic = await loadCoachAthleteOverviewBasic(viewerId, role);
    setRows(basic);
    setLoading(false);

    const enriched = await enrichCoachAthleteOverviewRows(basic);
    setRows(enriched);
    setScoresLoading(false);

    const athleteIds = enriched.map((row) => row.id);

    void Promise.all([
      loadAthleteOverviewDailyTracking(athleteIds),
      loadAthleteLastActivities(athleteIds),
    ]).then(([tracking, activities]) => {
      setDailyTrackingByAthlete(tracking);
      setLastActivityByAthlete(activities);
    });
  }

  async function reloadArchived(viewerId: string) {
    const data = await loadArchivedAthletesForCoach(viewerId);
    setArchivedRows(
      data.map((row) => ({
        id: row.id,
        fullName: row.full_name || "Naamloos",
        archivedAt: row.archived_at || null,
        betalingPrijs:
          row.betaling_prijs !== null && row.betaling_prijs !== undefined
            ? Number(row.betaling_prijs)
            : null,
      })),
    );
  }

  async function reloadPending(viewerId: string, role: string) {
    if (isAdminRole(role)) {
      setPendingProfiles([]);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "pending")
      .eq("coach_id", viewerId)
      .neq("pending_kind", "coach")
      .order("created_at", { ascending: false });

    setPendingProfiles(
      (data || []).map((profile) => ({
        id: profile.id,
        fullName: profile.full_name || "Geen naam",
      })),
    );
  }

  async function acceptPending(profileId: string) {
    const updatePayload: {
      role: string;
      coach_id?: string;
      pending_kind?: null;
    } = {
      role: "atleet",
      pending_kind: null,
    };

    if (isCoachLikeRole(coachRole) && !isAdminRole(coachRole)) {
      updatePayload.coach_id = coachId;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", profileId);

    if (error) {
      showToast(error.message);
      return;
    }

    if (updatePayload.coach_id) {
      await syncAthleteOrganizationFromCoach(profileId, updatePayload.coach_id);
    }

    await reloadPending(coachId, coachRole);
    setScoresLoading(true);
    await reloadRows(coachId, coachRole);
  }

  async function rejectPending(profileId: string) {
    const confirmed = await confirm({
      title: "Aanmelding afwijzen",
      message: "Weet je zeker dat je deze aanvraag wilt afwijzen?",
      confirmLabel: "Afwijzen",
      tone: "danger",
    });
    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (error) {
      showToast(error.message);
      return;
    }

    await reloadPending(coachId, coachRole);
  }

  async function removeAthlete(athleteId: string, athleteName: string) {
    const confirmed = await confirm({
      title: "Atleet verwijderen",
      message: `Weet je zeker dat je ${athleteName} wilt verwijderen? De data blijft bewaard in het archief onderaan.`,
      confirmLabel: "Verwijderen",
      tone: "danger",
    });
    if (!confirmed) return;

    const { error } = await removeAthleteFromOrganization(athleteId);
    if (error) {
      showToast(error.message);
      return;
    }

    setRows((current) => current.filter((row) => row.id !== athleteId));
    setSelectedAthleteIds((current) => current.filter((id) => id !== athleteId));
    void reloadArchived(coachId);
    void loadTotalAthleteIncome(coachId, coachRole).then((result) => {
      setTotalIncome(result.total);
    });
  }

  async function removeSelectedAthletes() {
    if (selectedAthleteIds.length === 0) return;

    const count = selectedAthleteIds.length;
    const confirmed = await confirm({
      title: "Atleten verwijderen",
      message: `Weet je zeker dat je ${count} atleet${count === 1 ? "" : "en"} wilt verwijderen? Hun data blijft bewaard in het archief.`,
      confirmLabel: "Verwijderen",
      tone: "danger",
    });
    if (!confirmed) return;

    for (const athleteId of selectedAthleteIds) {
      const { error } = await removeAthleteFromOrganization(athleteId);
      if (error) {
        showToast(error.message);
        break;
      }
    }

    setSelectedAthleteIds([]);
    setSelectionMode(false);
    setScoresLoading(true);
    await reloadRows(coachId, coachRole);
    await reloadArchived(coachId);
    const income = await loadTotalAthleteIncome(coachId, coachRole);
    setTotalIncome(income.total);
  }

  async function restoreAthlete(athleteId: string, athleteName: string) {
    const confirmed = await confirm({
      title: "Atleet terugzetten",
      message: `Weet je zeker dat je ${athleteName} terug wilt zetten in je team?`,
      confirmLabel: "Terugzetten",
    });
    if (!confirmed) return;

    const { error } = await restoreAthleteForCoach(athleteId);
    if (error) {
      showToast(error.message);
      return;
    }

    await reloadArchived(coachId);
    setScoresLoading(true);
    await reloadRows(coachId, coachRole);
    const income = await loadTotalAthleteIncome(coachId, coachRole);
    setTotalIncome(income.total);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!isCoachLikeRole(profile?.role)) {
        window.location.href = "/dashboard";
        return;
      }

      setCoachId(user.id);
      setCoachRole(profile?.role || "");

      if (isCoachLikeRole(profile?.role || "")) {
        void loadTotalAthleteIncome(user.id, profile?.role || "").then(
          (result) => {
            setTotalIncome(result.total);
          },
        );
        void reloadArchived(user.id);
      }

      await reloadPending(user.id, profile?.role || "");
      setScoresLoading(true);
      await reloadRows(user.id, profile?.role || "");
    }

    void init();
  }, []);

  const avgFillScore = useMemo(() => {
    if (rows.length === 0) return 0;
    return Math.round(
      rows.reduce((sum, row) => sum + row.fillScore, 0) / rows.length,
    );
  }, [rows]);

  const overduePaymentCount = useMemo(() => {
    let count = 0;
    for (const row of rows) {
      const history = buildMonthlyPaymentHistory(row.betalingPrijs, row.betalingDag);
      count += history.filter((entry) => entry.status === "overdue").length;
    }
    return count;
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const base = rows.filter((row) => {
      if (query && !row.fullName.toLowerCase().includes(query)) return false;

      if (quickFilter === "all") return true;

      if (quickFilter === "non-compliant") {
        const status = getRowStatus(row);
        return isAthleteBehind(row, status);
      }

      if (quickFilter === "meet-prep") {
        return row.weeksOut !== null && row.weeksOut <= 8;
      }

      return true;
    });

    const statusOrder: Record<AthleteStatus, number> = {
      active: 0,
      attention: 1,
      inactive: 2,
    };

    return [...base].sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case "status":
          cmp = statusOrder[getRowStatus(a)] - statusOrder[getRowStatus(b)];
          break;
        case "fillScore":
          cmp = a.fillScore - b.fillScore;
          break;
        case "birthDate":
          cmp = (a.geboortedatum || "").localeCompare(b.geboortedatum || "");
          break;
        case "lidnummer":
          cmp = (a.lidnummer || "").localeCompare(b.lidnummer || "", "nl");
          break;
        case "price":
          cmp = (a.betalingPrijs ?? -1) - (b.betalingPrijs ?? -1);
          break;
        case "paymentDay":
          cmp = (a.betalingDag ?? -1) - (b.betalingDag ?? -1);
          break;
        case "weeksOut":
          cmp = (a.weeksOut ?? 999) - (b.weeksOut ?? 999);
          break;
        case "lastActivity": {
          const daysA = lastActivityByAthlete.get(a.id)?.daysAgo ?? 9999;
          const daysB = lastActivityByAthlete.get(b.id)?.daysAgo ?? 9999;
          cmp = daysA - daysB;
          break;
        }
        default:
          cmp = a.fullName.localeCompare(b.fullName, "nl");
      }

      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, search, quickFilter, sortKey, sortDir, getRowStatus, lastActivityByAthlete]);

  const handleExport = useCallback(() => {
    downloadAthleteOverviewCsv(filtered, "fillScore", "Invulscore");
  }, [filtered]);

  useEffect(() => {
    onExportContext?.({
      download: handleExport,
      disabled: filtered.length === 0,
    });
  }, [filtered.length, handleExport, onExportContext]);

  const primaryPending = pendingProfiles[0] ?? null;
  const extraPendingCount = Math.max(0, pendingProfiles.length - 1);
  const tableColumnCount = selectionMode ? 10 : 9;

  return (
    <div className="pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0">
      <AthletesHeader
        pendingCount={pendingProfiles.length}
        selectionMode={selectionMode}
        selectedCount={selectedAthleteIds.length}
        onToggleSelection={() => {
          setSelectionMode((current) => {
            if (current) setSelectedAthleteIds([]);
            return !current;
          });
        }}
        onInvite={onInviteClick}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <AthletesSearchBar value={search} onChange={setSearch} />
        <AthletesFilterTabs value={quickFilter} onChange={setQuickFilter} />
        {selectionMode && selectedAthleteIds.length > 0 ? (
          <button
            type="button"
            onClick={() => void removeSelectedAthletes()}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] font-semibold text-red-300 transition hover:bg-red-500/15 app-focus-ring"
          >
            Verwijder {selectedAthleteIds.length} geselecteerd
          </button>
        ) : null}
      </div>

      <AthleteMetricBar
        athleteCount={rows.length}
        revenueLabel={
          totalIncome !== null
            ? formatPaymentPriceCompact(totalIncome) || formatPaymentPrice(totalIncome)
            : "—"
        }
        avgFillScoreLabel={`${avgFillScore}%`}
        overdueCount={overduePaymentCount}
        scoresLoading={scoresLoading}
      />

      {primaryPending ? (
        <div
          ref={pendingBannerRef}
          className={`${athletesGlassCard} mb-5 overflow-hidden border-amber-500/30`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                <Clock className="h-4 w-4" />
              </span>
              <p className="truncate text-[14px] font-medium text-app-text">
                <span className="font-semibold">{titleCaseName(primaryPending.fullName)}</span>
                {" wacht op goedkeuring"}
                {extraPendingCount > 0 ? (
                  <span className="ml-1 text-[12px] font-normal text-app-muted">
                    (+{extraPendingCount})
                  </span>
                ) : null}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void acceptPending(primaryPending.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-300 transition hover:bg-emerald-500/15 app-focus-ring"
              >
                Goedkeuren
              </button>
              <button
                type="button"
                onClick={() => void rejectPending(primaryPending.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-[12px] font-semibold text-app-muted transition hover:bg-app-surface-hover app-focus-ring"
              >
                Afwijzen
              </button>
            </div>
          </div>

          {pendingProfiles.length > 1 ? (
            <details className="border-t border-amber-500/20 bg-app-surface/40">
              <summary className="cursor-pointer px-4 py-2 text-[12px] font-medium text-app-muted hover:text-app-text">
                Alle aanmeldingen in afwachting ({pendingProfiles.length})
              </summary>
              <ul>
                {pendingProfiles.slice(1).map((profile) => (
                  <li
                    key={profile.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border/50 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPendingIds.includes(profile.id)}
                        onChange={(event) =>
                          setSelectedPendingIds((current) =>
                            event.target.checked
                              ? [...current, profile.id]
                              : current.filter((id) => id !== profile.id),
                          )
                        }
                        className="rounded border-app-border accent-brand-purple"
                      />
                      <span className="text-[13px] font-medium text-app-text">
                        {profile.fullName}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void acceptPending(profile.id)}
                        className="app-btn-primary !px-2.5 !py-1 text-[11px]"
                      >
                        Goedkeuren
                      </button>
                      <button
                        type="button"
                        onClick={() => void rejectPending(profile.id)}
                        className="app-btn-secondary !px-2.5 !py-1 text-[11px] !text-app-destructive"
                      >
                        Afwijzen
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className={`${athletesGlassCard} overflow-hidden`}>
        {loading ? (
          <div className="p-4">
            <SkeletonList rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="athletes"
            title={
              quickFilter === "all" && !search.trim()
                ? "Nodig je eerste atleet uit"
                : "Geen atleten gevonden"
            }
            description={
              quickFilter === "all" && !search.trim()
                ? "Deel een uitnodigingslink om je eerste atleet te koppelen en te beginnen met coachen."
                : "Pas je zoekopdracht of filters aan om atleten te vinden."
            }
            action={
              quickFilter === "all" && !search.trim() && onInviteClick ? (
                <button
                  type="button"
                  onClick={onInviteClick}
                  className="app-btn-primary min-h-[44px]"
                >
                  Atleet uitnodigen
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="athletes-table-wrap hidden lg:block">
              <table className="w-full table-fixed border-collapse">
                <AthleteOverviewTableColGroup selectionMode={selectionMode} />
                <AthleteOverviewTableHead selectionMode={selectionMode} />
                <tbody>
                  {filtered.map((row) => {
                    const displayName = titleCaseName(row.fullName);
                    const rowStatus = getRowStatus(row);
                    const sharedProps = {
                      row,
                      displayName,
                      handle: athleteHandle(row.fullName),
                      statusMeta: getAthleteStatusMeta(rowStatus),
                      activity: lastActivityByAthlete.get(row.id),
                      tracking: dailyTrackingByAthlete.get(row.id),
                      scoresLoading,
                      daysInMonth,
                      todayDay,
                      coachRole,
                      selectionMode,
                      selected: selectedAthleteIds.includes(row.id),
                      highlightRow:
                        quickFilter === "non-compliant" &&
                        isAthleteBehind(row, rowStatus),
                      columnCount: tableColumnCount,
                      onToggleSelect: (selected: boolean) =>
                        setSelectedAthleteIds((current) =>
                          selected
                            ? [...current, row.id]
                            : current.filter((id) => id !== row.id),
                        ),
                      onOpen: () => router.push(`/athletes/${row.id}`),
                      onRemove: () => void removeAthlete(row.id, row.fullName),
                    };
                    return <AthleteOverviewDesktopRow key={row.id} {...sharedProps} />;
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-app-border/70 lg:hidden">
              {filtered.map((row) => {
                const displayName = titleCaseName(row.fullName);
                const rowStatus = getRowStatus(row);
                return (
                  <AthleteOverviewMobileCard
                    key={row.id}
                    row={row}
                    displayName={displayName}
                    handle={athleteHandle(row.fullName)}
                    statusMeta={getAthleteStatusMeta(rowStatus)}
                    activity={lastActivityByAthlete.get(row.id)}
                    tracking={dailyTrackingByAthlete.get(row.id)}
                    scoresLoading={scoresLoading}
                    daysInMonth={daysInMonth}
                    todayDay={todayDay}
                    coachRole={coachRole}
                    selectionMode={selectionMode}
                    selected={selectedAthleteIds.includes(row.id)}
                    highlightRow={
                      quickFilter === "non-compliant" &&
                      isAthleteBehind(row, rowStatus)
                    }
                    columnCount={tableColumnCount}
                    onToggleSelect={(selected) =>
                      setSelectedAthleteIds((current) =>
                        selected
                          ? [...current, row.id]
                          : current.filter((id) => id !== row.id),
                      )
                    }
                    onOpen={() => router.push(`/athletes/${row.id}`)}
                    onRemove={() => void removeAthlete(row.id, row.fullName)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      {!hideExportButton ? (
        <div className="mt-5 flex justify-end pb-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="athletes-export-btn app-focus-ring"
          >
            <Download className="h-3 w-3" />
            Exporteer CSV
          </button>
        </div>
      ) : null}

      {archivedRows.length > 0 ? (
        <details className={`${athletesGlassCard} mt-5 overflow-hidden`}>
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-[14px] font-medium text-app-text marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-surface-raised text-app-muted">
              <Archive className="h-4 w-4" />
            </span>
            Gearchiveerde atleten ({archivedRows.length})
          </summary>
          <ul className="divide-y divide-app-border/70 border-t border-app-border/70">
            {archivedRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-app-text">
                    {titleCaseName(row.fullName)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-app-muted">
                    Verwijderd{" "}
                    {row.archivedAt
                      ? new Date(row.archivedAt).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                    {row.betalingPrijs
                      ? ` · ${formatPaymentPrice(row.betalingPrijs)}/mnd`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/athletes/${row.id}`)}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-app-border bg-app-surface px-3 py-2 text-[12px] font-semibold text-app-text transition hover:bg-app-surface-hover app-focus-ring"
                  >
                    Data bekijken
                  </button>
                  <button
                    type="button"
                    onClick={() => void restoreAthlete(row.id, row.fullName)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[12px] font-semibold text-emerald-300 transition hover:bg-emerald-500/15 app-focus-ring"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Terugzetten
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <Toast message={toastMessage} onDismiss={clearToast} />
    </div>
  );
}
