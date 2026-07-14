"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  ClipboardList,
  MessageSquare,
  X,
} from "lucide-react";
import ChatAvatar from "@/components/chat/ChatAvatar";
import AthleteDailyTrackingGrid, {
  AthleteDailyTrackingHeader,
} from "@/components/coach/AthleteDailyTrackingGrid";
import AthletePaymentTimeline from "@/components/coach/athletes/AthletePaymentTimeline";
import AthleteWeeksOutHover from "@/components/coach/athletes/AthleteWeeksOutHover";
import FillScoreSparkline from "@/components/coach/FillScoreSparkline";
import {
  buildMonthlyPaymentHistory,
  formatPaymentPriceCompact,
  type MonthlyPaymentEntry,
  type MonthlyPaymentStatus,
} from "@/lib/athletePayments";
import type { CoachAthleteOverviewRow } from "@/lib/coachAthleteOverview";
import type { AthleteDailyTrackingRow } from "@/lib/athleteOverviewDailyTracking";
import type { AthleteLastActivity } from "@/lib/athleteLastActivity";
import type { AthleteStatusMeta } from "@/lib/athleteStatus";
import { isAdminRole } from "@/lib/authRoles";

type ExpandedSection = null | "payments" | "fillScore" | "bodyweight";

export type AthleteOverviewRowProps = {
  row: CoachAthleteOverviewRow;
  displayName: string;
  handle: string;
  statusMeta: AthleteStatusMeta;
  activity: AthleteLastActivity | undefined;
  tracking: AthleteDailyTrackingRow | undefined;
  scoresLoading: boolean;
  daysInMonth: number;
  todayDay: number;
  coachRole: string;
  selectionMode: boolean;
  selected: boolean;
  highlightRow?: boolean;
  columnCount: number;
  onToggleSelect: (selected: boolean) => void;
  onOpen: () => void;
  onRemove: () => void;
};

const TABLE_HEAD = "athletes-table-head";
const TABLE_ROW = "athletes-table-row";

function formatBirthDateShort(dateStr: string | null) {
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fillScoreTone(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

function fillScoreSparkTone(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

function shortPaymentMonth(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`)
    .toLocaleDateString("nl-NL", { month: "short" })
    .replace(".", "");
}

function paymentPillLabel(entry: MonthlyPaymentEntry) {
  const month = shortPaymentMonth(entry.isoDate);
  switch (entry.status) {
    case "paid":
      return `Betaald ${month}`;
    case "overdue":
      return `Overdue ${month}`;
    default:
      return `Gepland ${month}`;
  }
}

function paymentPillStyles(status: MonthlyPaymentStatus) {
  switch (status) {
    case "paid":
      return {
        className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
        icon: Check,
      };
    case "overdue":
      return {
        className: "border-rose-500/40 bg-rose-500/10 text-rose-300",
        icon: AlertCircle,
      };
    default:
      return {
        className: "border-app-border/80 bg-app-surface/60 text-app-subtle",
        icon: Clock,
      };
  }
}

function stopRowNav(event: React.MouseEvent) {
  event.stopPropagation();
}

function EmptyCell() {
  return <span className="block w-full text-center text-[11px] text-app-subtle/40">—</span>;
}

function DataCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`athletes-data-cell ${className}`}>
      <div className="athletes-data-cell-inner">{children}</div>
    </td>
  );
}

function ExpandableValue({
  value,
  active,
  onClick,
  toneClass = "text-app-text",
  align = "center",
}: {
  value: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  toneClass?: string;
  align?: "left" | "center";
}) {
  const alignClass = align === "center" ? "justify-center" : "justify-start";

  if (!onClick) {
    return (
      <span className={`inline-flex ${alignClass} text-[11px] font-medium tabular-nums ${toneClass}`}>
        {value}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        stopRowNav(event);
        onClick?.();
      }}
      className={`athletes-cell-interactive inline-flex items-center gap-1 rounded-[10px] px-2 py-1 transition app-focus-ring ${alignClass} ${active ? "athletes-cell-interactive--active" : ""}`}
    >
      <span
        className={`border-b border-dotted border-app-subtle/50 text-[11px] font-medium tabular-nums ${toneClass}`}
      >
        {value}
      </span>
      <ChevronDown
        className={`h-3.5 w-3.5 shrink-0 text-app-subtle/80 transition ${active ? "rotate-180 text-app-accent" : ""}`}
      />
    </button>
  );
}

function ExpandedTrackingPanel({
  label,
  monthLabel,
  tracking,
  scoresLoading,
  daysInMonth,
  todayDay,
  mode,
}: {
  label: string;
  monthLabel: string;
  tracking: AthleteDailyTrackingRow | undefined;
  scoresLoading: boolean;
  daysInMonth: number;
  todayDay: number;
  mode: "fillScore" | "bodyweight";
}) {
  const trendValues =
    mode === "fillScore"
      ? tracking?.fillScoreTrend30 ?? []
      : tracking?.bodyweightTrend30 ?? [];

  const trendTone =
    mode === "fillScore" && trendValues.length > 0
      ? fillScoreSparkTone(trendValues[trendValues.length - 1] ?? 0)
      : "text-app-accent";

  return (
    <div className="border-t border-app-border/40 bg-app-surface-raised/15 px-4 py-2">
      {scoresLoading || !tracking ? (
        <p className="text-[12px] text-app-muted">…</p>
      ) : (
        <>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-app-subtle">
            {label} — {monthLabel}
          </p>
          {trendValues.length >= 2 ? (
            <div className="mb-3 rounded-lg border border-white/6 bg-black/20 px-3 py-2.5">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-app-subtle">
                Trend — laatste 30 dagen
              </p>
              <FillScoreSparkline
                values={trendValues}
                width={320}
                height={36}
                className={trendTone}
              />
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <AthleteDailyTrackingHeader daysInMonth={daysInMonth} todayDay={todayDay} />
              <AthleteDailyTrackingGrid
                mode={mode}
                fillScoreByDay={tracking.fillScoreByDay}
                bodyweightByDay={tracking.bodyweightByDay}
                fillScoreValueByDay={tracking.fillScoreValueByDay}
                bodyweightValueByDay={tracking.bodyweightValueByDay}
                daysInMonth={daysInMonth}
                todayDay={todayDay}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AthleteOverviewTableColGroup({
  selectionMode,
}: {
  selectionMode: boolean;
}) {
  return (
    <colgroup>
      {selectionMode ? <col className="w-[44px]" /> : null}
      <col className="w-[26%]" />
      <col className="w-[8%]" />
      <col className="w-[7%]" />
      <col className="w-[6%]" />
      <col className="w-[10%]" />
      <col className="w-[8%]" />
      <col className="w-[14%]" />
      <col className="w-[7%]" />
      <col className="w-[10%]" />
    </colgroup>
  );
}

export function AthleteOverviewTableHead({
  selectionMode,
}: {
  selectionMode: boolean;
}) {
  return (
    <thead className={TABLE_HEAD}>
      <tr className="border-b border-white/[0.08] bg-black/10">
        {selectionMode ? <th className="athletes-th-select" aria-hidden /> : null}
        <th className="athletes-th-athlete">Atleet</th>
        <th className="athletes-th-numeric athletes-th-center">Prijs</th>
        <th className="athletes-th-numeric athletes-th-center">Dag</th>
        <th className="athletes-th-numeric athletes-th-center">Weeks</th>
        <th className="athletes-th-numeric athletes-th-center">Geboorte.</th>
        <th className="athletes-th-numeric athletes-th-center">Lidnr</th>
        <th className="athletes-th-numeric athletes-th-center">Invulscore</th>
        <th className="athletes-th-numeric athletes-th-center">BW</th>
        <th className="athletes-th-actions">Acties</th>
      </tr>
    </thead>
  );
}

export function AthleteOverviewDesktopRow(props: AthleteOverviewRowProps) {
  const {
    row,
    displayName,
    handle,
    statusMeta,
    activity,
    tracking,
    scoresLoading,
    daysInMonth,
    todayDay,
    coachRole,
    selectionMode,
    selected,
    highlightRow = false,
    columnCount,
    onToggleSelect,
    onOpen,
    onRemove,
  } = props;

  const [expanded, setExpanded] = useState<ExpandedSection>(null);

  const paymentHistory = useMemo(
    () => buildMonthlyPaymentHistory(row.betalingPrijs, row.betalingDag),
    [row.betalingDag, row.betalingPrijs],
  );

  const canExpandPayments = row.betalingPrijs !== null;

  function togglePayments() {
    if (!canExpandPayments) return;
    setExpanded((current) => (current === "payments" ? null : "payments"));
  }

  function toggleSection(section: Exclude<ExpandedSection, null>) {
    if (section === "payments") {
      togglePayments();
      return;
    }
    setExpanded((current) => (current === section ? null : section));
  }

  const monthLabel = new Date().toLocaleDateString("nl-NL", { month: "long" });
  const daysAgo = activity?.daysAgo;
  const activityLabel =
    daysAgo === null || daysAgo === undefined
      ? ""
      : daysAgo === 0
        ? "vandaag"
        : `${daysAgo}d`;
  const birthDate = formatBirthDateShort(row.geboortedatum);
  const scoreTone = fillScoreTone(row.fillScore);
  const priceCompact = formatPaymentPriceCompact(row.betalingPrijs);

  const rowClass = [
    TABLE_ROW,
    "athletes-table-row--clickable",
    expanded ? "athletes-table-row--expanded" : "",
    highlightRow ? "bg-amber-500/[0.04]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function handleRowClick() {
    onOpen();
  }

  function handleRowKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <>
      <tr
        className={rowClass}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        tabIndex={0}
        role="link"
        aria-label={`Open hub van ${displayName}`}
      >
        {selectionMode ? (
          <td className="athletes-td-select" onClick={stopRowNav}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onToggleSelect(event.target.checked)}
              onClick={stopRowNav}
              className="athletes-select-checkbox rounded border-app-border accent-brand-purple"
              aria-label={`${displayName} selecteren`}
            />
          </td>
        ) : null}

        <td className="athletes-cell-athlete">
          <div className="flex min-w-0 items-center gap-2.5">
            <ChatAvatar
              name={displayName}
              className="h-10 w-10 shrink-0 text-[11px]"
              fallbackClassName="bg-app-accent/15 text-app-accent ring-1 ring-app-accent/20"
            />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate text-[14px] font-bold text-app-text">
                  {displayName}
                </span>
                <span
                  className={`ui-badge shrink-0 rounded-full !px-2 !py-0.5 text-[10px] ${statusMeta.badgeClass}`}
                >
                  {statusMeta.label}
                </span>
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-app-subtle/75">
                <span className="truncate">{handle}</span>
                {activityLabel ? (
                  <>
                    <span className="text-app-border">·</span>
                    <span className="shrink-0 tabular-nums">{activityLabel}</span>
                  </>
                ) : null}
              </span>
            </span>
          </div>
        </td>

        <DataCell>
          {priceCompact ? (
            <ExpandableValue
              value={priceCompact}
              active={expanded === "payments"}
              onClick={togglePayments}
              align="center"
            />
          ) : (
            <EmptyCell />
          )}
        </DataCell>

        <DataCell>
          {row.betalingDag !== null ? (
            <span className="tabular-nums">{row.betalingDag}</span>
          ) : (
            <EmptyCell />
          )}
        </DataCell>

        <DataCell>
          {scoresLoading ? (
            <span className="text-app-muted">…</span>
          ) : row.weeksOut !== null ? (
            <AthleteWeeksOutHover
              weeksOut={row.weeksOut}
              competitions={row.upcomingCompetitions}
              onPointerDown={stopRowNav}
            />
          ) : (
            <EmptyCell />
          )}
        </DataCell>

        <DataCell className="text-app-muted">
          {birthDate ?? <EmptyCell />}
        </DataCell>

        <DataCell className="text-app-muted">
          {row.lidnummer ?? <EmptyCell />}
        </DataCell>

        <DataCell>
          {scoresLoading ? (
            <span className="text-app-muted">…</span>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                stopRowNav(event);
                toggleSection("fillScore");
              }}
              className={`athletes-cell-interactive inline-flex items-center justify-center gap-1 rounded-[10px] px-2 py-1 transition app-focus-ring ${expanded === "fillScore" ? "athletes-cell-interactive--active" : ""}`}
            >
              <span
                className={`border-b border-dotted border-app-subtle/50 text-[12px] font-semibold tabular-nums tracking-tight ${scoreTone}`}
              >
                {row.fillScore}%
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-app-subtle/80 transition ${expanded === "fillScore" ? "rotate-180 text-app-accent" : ""}`}
              />
            </button>
          )}
        </DataCell>

        <DataCell>
          {scoresLoading ? (
            <span className="text-app-muted">…</span>
          ) : row.bodyweightKg !== null ? (
            <ExpandableValue
              value={`${row.bodyweightKg}kg`}
              active={expanded === "bodyweight"}
              onClick={() => toggleSection("bodyweight")}
              align="center"
            />
          ) : (
            <EmptyCell />
          )}
        </DataCell>

        <td className="athletes-actions-cell" onClick={stopRowNav}>
          <div className="athletes-actions-group">
            <Link
              href={`/chat?athlete=${row.id}&from=${encodeURIComponent("/athletes")}`}
              className="athletes-action-btn"
              title="Chat"
              onClick={stopRowNav}
            >
              <MessageSquare className="h-4 w-4" />
            </Link>
            <Link
              href={`/programs?athlete=${row.id}`}
              className="athletes-action-btn"
              title="Programma"
              onClick={stopRowNav}
            >
              <ClipboardList className="h-4 w-4" />
            </Link>
            {!isAdminRole(coachRole) ? (
              <button
                type="button"
                onClick={(event) => {
                  stopRowNav(event);
                  onRemove();
                }}
                className="athletes-action-btn athletes-action-btn--danger"
                title="Verwijderen"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </td>
      </tr>

      {expanded === "payments" ? (
        <tr className="border-b border-app-border/40 bg-black/15" onClick={stopRowNav}>
          <td colSpan={columnCount} className="!h-auto px-3 py-1">
            <AthletePaymentTimeline entries={paymentHistory} />
          </td>
        </tr>
      ) : null}

      {expanded === "fillScore" ? (
        <tr className="border-b border-app-border/50">
          <td colSpan={columnCount} className="p-0">
            <ExpandedTrackingPanel
              label="Invulscore"
              monthLabel={monthLabel}
              tracking={tracking}
              scoresLoading={scoresLoading}
              daysInMonth={daysInMonth}
              todayDay={todayDay}
              mode="fillScore"
            />
          </td>
        </tr>
      ) : null}

      {expanded === "bodyweight" ? (
        <tr className="border-b border-app-border/50">
          <td colSpan={columnCount} className="p-0">
            <ExpandedTrackingPanel
              label="Bodyweight"
              monthLabel={monthLabel}
              tracking={tracking}
              scoresLoading={scoresLoading}
              daysInMonth={daysInMonth}
              todayDay={todayDay}
              mode="bodyweight"
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function AthleteOverviewMobileCard(props: AthleteOverviewRowProps) {
  const {
    row,
    displayName,
    handle,
    statusMeta,
    activity,
    tracking,
    scoresLoading,
    daysInMonth,
    todayDay,
    coachRole,
    selectionMode,
    selected,
    highlightRow = false,
    onToggleSelect,
    onOpen,
    onRemove,
  } = props;

  const [expanded, setExpanded] = useState<ExpandedSection>(null);

  const paymentHistory = useMemo(
    () => buildMonthlyPaymentHistory(row.betalingPrijs, row.betalingDag),
    [row.betalingDag, row.betalingPrijs],
  );

  const monthLabel = new Date().toLocaleDateString("nl-NL", { month: "long" });
  const daysAgo = activity?.daysAgo;
  const activityLabel =
    daysAgo === null || daysAgo === undefined
      ? ""
      : daysAgo === 0
        ? "vandaag"
        : `${daysAgo}d`;
  const birthDate = formatBirthDateShort(row.geboortedatum);
  const scoreTone = fillScoreTone(row.fillScore);
  const priceCompact = formatPaymentPriceCompact(row.betalingPrijs);

  function togglePayments() {
    if (row.betalingPrijs === null) return;
    setExpanded((current) => (current === "payments" ? null : "payments"));
  }

  function toggleSection(section: Exclude<ExpandedSection, null>) {
    setExpanded((current) => (current === section ? null : section));
  }

  return (
    <article
      className={[
        "athletes-mobile-card px-3 py-2 transition",
        highlightRow ? "bg-amber-500/[0.05]" : "",
        expanded ? "bg-app-surface-raised/10" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onOpen}
      role="link"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start gap-2">
        {selectionMode ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onToggleSelect(event.target.checked)}
            onClick={stopRowNav}
            className="athletes-select-checkbox mt-2 rounded border-app-border accent-brand-purple"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <ChatAvatar name={displayName} className="h-8 w-8 text-[10px]" />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-semibold">{displayName}</span>
                <span className={`ui-badge !px-1.5 !py-0 text-[10px] ${statusMeta.badgeClass}`}>
                  {statusMeta.label}
                </span>
              </span>
              <span className="text-[10px] text-app-subtle">
                {handle}
                {activityLabel ? ` · ${activityLabel}` : ""}
              </span>
            </span>
          </span>
        </div>
        <div className="athletes-actions-group shrink-0" onClick={stopRowNav}>
          <Link
            href={`/chat?athlete=${row.id}&from=${encodeURIComponent("/athletes")}`}
            className="athletes-action-btn"
            onClick={stopRowNav}
          >
            <MessageSquare className="h-4 w-4" />
          </Link>
          <Link
            href={`/programs?athlete=${row.id}`}
            className="athletes-action-btn"
            onClick={stopRowNav}
          >
            <ClipboardList className="h-4 w-4" />
          </Link>
          {!isAdminRole(coachRole) ? (
            <button
              type="button"
              onClick={(event) => {
                stopRowNav(event);
                onRemove();
              }}
              className="athletes-action-btn athletes-action-btn--danger"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5" onClick={stopRowNav}>
        {priceCompact ? (
          <button
            type="button"
            onClick={togglePayments}
            className={`rounded-md border px-2 py-1 text-[11px] tabular-nums ${
              expanded === "payments"
                ? "border-app-accent/40 bg-app-accent/10 text-app-accent"
                : "border-dotted border-app-border/60"
            }`}
          >
            {priceCompact}
          </button>
        ) : null}
        {row.betalingDag !== null ? (
          <span className="rounded-md px-2 py-1 text-[11px] text-app-muted">Dag {row.betalingDag}</span>
        ) : null}
        {row.weeksOut !== null ? (
          <span
            className="rounded-md px-2 py-1 text-[11px] text-app-muted"
            onClick={stopRowNav}
            onPointerDown={stopRowNav}
          >
            <AthleteWeeksOutHover
              weeksOut={row.weeksOut}
              competitions={row.upcomingCompetitions}
              onPointerDown={stopRowNav}
            />
          </span>
        ) : null}
        <button type="button" onClick={() => toggleSection("fillScore")} className={`rounded-md px-2 py-1 text-[11px] ${scoreTone}`}>
          {scoresLoading ? "…" : `${row.fillScore}%`}
        </button>
        {row.bodyweightKg !== null ? (
          <button type="button" onClick={() => toggleSection("bodyweight")} className="rounded-md px-2 py-1 text-[11px]">
            {row.bodyweightKg}kg
          </button>
        ) : null}
        {birthDate ? <span className="rounded-md px-2 py-1 text-[11px] text-app-muted">{birthDate}</span> : null}
      </div>

      {expanded === "payments" && paymentHistory.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-2">
          {paymentHistory.map((entry) => {
            const styles = paymentPillStyles(entry.status);
            const Icon = styles.icon;
            return (
              <div key={entry.isoDate} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${styles.className}`}>
                <Icon className="h-3 w-3" />
                {paymentPillLabel(entry)}
              </div>
            );
          })}
        </div>
      ) : null}

      {expanded === "fillScore" ? (
        <ExpandedTrackingPanel
          label="Invulscore"
          monthLabel={monthLabel}
          tracking={tracking}
          scoresLoading={scoresLoading}
          daysInMonth={daysInMonth}
          todayDay={todayDay}
          mode="fillScore"
        />
      ) : null}

      {expanded === "bodyweight" ? (
        <ExpandedTrackingPanel
          label="Bodyweight"
          monthLabel={monthLabel}
          tracking={tracking}
          scoresLoading={scoresLoading}
          daysInMonth={daysInMonth}
          todayDay={todayDay}
          mode="bodyweight"
        />
      ) : null}
    </article>
  );
}

// Backwards-compatible default export name
export default AthleteOverviewDesktopRow;
