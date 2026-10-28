"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createProgramBlockForAthlete } from "@/lib/programBlockCreate";
import { createProgramWeekForBlock } from "@/lib/programWeekCreate";
import { withPreserveWeekParam } from "@/lib/programNavigation";
import { getProgramDayDate } from "@/lib/athleteFillScore";
import { loadProgramMacrocycles, createProgramMacrocycle } from "@/lib/programMacrocycles";
import { loadAthleteUpcomingCompetitions } from "@/lib/competitions";
import {
  loadProgramPlanningNotes,
  saveProgramPlanningBlockNote,
  saveProgramPlanningWeekNote,
} from "@/lib/programPlanningNotes";
import PlanningHoverNote from "@/components/planning/PlanningHoverNote";

type TimelineWeek = {
  id: string;
  title: string;
  weekNumber: number;
  startDate: string | null;
  href: string;
};

type TimelineBlock = {
  id: string;
  title: string;
  startDate: string | null;
  macrocycleId: string | null;
  macrocycleTitle: string | null;
  weeks: TimelineWeek[];
};

type TimelineMacrocycle = {
  id: string;
  title: string;
  blocks: TimelineBlock[];
};

type ColumnEntry = {
  weekId: string;
  weekLabel: string;
  href: string;
  blockId: string;
  blockTitle: string;
  macroId: string | null;
  macroTitle: string | null;
};

type WeekColumn = {
  key: string;
  weekStart: string | null;
  entries: ColumnEntry[];
};

type SpanRow = {
  key: string;
  label: string;
  start: number;
  end: number;
  className: string;
  blockId?: string;
  blockIds?: string[];
  macroId?: string | null;
};

type TimelineMeet = {
  id: string;
  naam: string;
  startDate: string;
  endDate: string;
  columnIndex: number;
};

type ProgramPlanningCalendarProps = {
  athleteId: string;
  athleteName: string;
  canEditNotes: boolean;
  coachId?: string;
};

const WEEK_COL_WIDTH = 64;
const LABEL_COL_WIDTH = "5rem";
const MEET_COLUMN_CLASS = "bg-amber-100 text-amber-950 hover:bg-amber-200";
const TODAY_LINE_CLASS = "bg-rose-500";

const BLOCK_PALETTE = [
  {
    bg: "bg-blue-100",
    border: "border-blue-300",
    text: "text-blue-950",
  },
  {
    bg: "bg-emerald-100",
    border: "border-emerald-300",
    text: "text-emerald-950",
  },
  {
    bg: "bg-orange-100",
    border: "border-orange-300",
    text: "text-orange-950",
  },
  {
    bg: "bg-pink-100",
    border: "border-pink-300",
    text: "text-pink-950",
  },
  {
    bg: "bg-cyan-100",
    border: "border-cyan-300",
    text: "text-cyan-950",
  },
  {
    bg: "bg-lime-100",
    border: "border-lime-300",
    text: "text-lime-950",
  },
] as const;

type BlockColor = (typeof BLOCK_PALETTE)[number];

function getBlockColor(index: number): BlockColor {
  return BLOCK_PALETTE[index % BLOCK_PALETTE.length]!;
}

const DUTCH_MONTHS_SHORT = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

function toLocalDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatPlanningWeekDate(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;

  const day = date.getDate();
  const month = DUTCH_MONTHS_SHORT[date.getMonth()] || "???";
  return `${day}-${month}`;
}

function addDaysToDateString(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

function datesOverlap(
  rangeStart: string,
  rangeEnd: string,
  weekStart: string,
  weekEnd: string,
) {
  return rangeStart <= weekEnd && rangeEnd >= weekStart;
}

function getMeetColumns(columns: WeekColumn[], meets: TimelineMeet[]) {
  const meetColumnIndices = new Set<number>();
  const meetNamesByColumn = new Map<number, string[]>();
  const meetsByColumn = new Map<number, TimelineMeet[]>();

  for (const meet of meets) {
    for (let index = 0; index < columns.length; index += 1) {
      const weekStart = columns[index]?.weekStart;
      if (!weekStart) continue;

      const weekEnd = addDaysToDateString(weekStart, 6);
      if (!datesOverlap(meet.startDate, meet.endDate, weekStart, weekEnd)) {
        continue;
      }

      meetColumnIndices.add(index);
      const names = meetNamesByColumn.get(index) || [];
      if (!names.includes(meet.naam)) {
        names.push(meet.naam);
      }
      meetNamesByColumn.set(index, names);

      const columnMeets = meetsByColumn.get(index) || [];
      if (!columnMeets.some((entry) => entry.id === meet.id)) {
        columnMeets.push(meet);
      }
      meetsByColumn.set(index, columnMeets);
    }
  }

  return { meetColumnIndices, meetNamesByColumn, meetsByColumn };
}

function buildBlockColorIndex(columns: WeekColumn[]) {
  const blockColorIndex = new Map<string, number>();
  let nextIndex = 0;

  for (const column of columns) {
    const blockId = column.entries[0]?.blockId;
    if (!blockId || blockColorIndex.has(blockId)) continue;
    blockColorIndex.set(blockId, nextIndex);
    nextIndex += 1;
  }

  return blockColorIndex;
}

function getTodayMarker(columns: WeekColumn[]) {
  if (columns.length === 0) return null;

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayMs = today.getTime();

  const firstWeekStart = columns.find((column) => column.weekStart)?.weekStart;
  const lastWeekStart = [...columns].reverse().find((column) => column.weekStart)
    ?.weekStart;

  if (!firstWeekStart || !lastWeekStart) return null;

  const timelineStart = new Date(`${firstWeekStart}T12:00:00`).getTime();
  const timelineEnd =
    new Date(`${addDaysToDateString(lastWeekStart, 7)}T12:00:00`).getTime();

  if (todayMs < timelineStart || todayMs >= timelineEnd) return null;

  for (let index = 0; index < columns.length; index += 1) {
    const weekStart = columns[index]?.weekStart;
    if (!weekStart) continue;

    const startMs = new Date(`${weekStart}T12:00:00`).getTime();
    const endMs = new Date(`${addDaysToDateString(weekStart, 7)}T12:00:00`).getTime();

    if (todayMs < startMs || todayMs >= endMs) continue;

    const fraction = (todayMs - startMs) / (endMs - startMs);
    const day = today.getDate();
    const month = DUTCH_MONTHS_SHORT[today.getMonth()] || "???";

    return {
      left: `calc(${LABEL_COL_WIDTH} + ${index * WEEK_COL_WIDTH}px + ${fraction * WEEK_COL_WIDTH}px)`,
      label: `${day}-${month}`,
    };
  }

  return null;
}

function buildBlockRows(
  columns: WeekColumn[],
  blockColorIndex: Map<string, number>,
): SpanRow[] {
  const rows: SpanRow[] = [];
  let index = 0;

  while (index < columns.length) {
    const blockId = columns[index]!.entries[0]?.blockId;
    if (!blockId) {
      index += 1;
      continue;
    }

    const label = columns[index]!.entries[0]!.blockTitle;
    const color = getBlockColor(blockColorIndex.get(blockId) ?? 0);
    let end = index;

    while (
      end + 1 < columns.length &&
      columns[end + 1]!.entries[0]?.blockId === blockId
    ) {
      end += 1;
    }

    rows.push({
      key: `block-${blockId}-${index}`,
      label,
      start: index,
      end,
      blockId,
      blockIds: [blockId],
      className: `${color.border} ${color.bg} ${color.text}`,
    });

    index = end + 1;
  }

  return rows;
}

function getColumnBlockColor(
  column: WeekColumn,
  blockColorIndex: Map<string, number>,
): BlockColor {
  const blockId = column.entries[0]?.blockId;
  if (!blockId) {
    return getBlockColor(0);
  }

  return getBlockColor(blockColorIndex.get(blockId) ?? 0);
}

function getMeetWeekHref(athleteId: string, meetId: string) {
  const params = new URLSearchParams({ athlete: athleteId, competition: meetId });
  return `/meet-week?${params.toString()}`;
}

function buildMacroRows(columns: WeekColumn[]): SpanRow[] {
  const rows: SpanRow[] = [];
  let index = 0;

  while (index < columns.length) {
    const macroId = columns[index]!.entries[0]?.macroId ?? null;

    if (!macroId) {
      index += 1;
      continue;
    }

    const label = columns[index]!.entries[0]!.macroTitle || "Macrocycle";
    let end = index;

    while (
      end + 1 < columns.length &&
      (columns[end + 1]!.entries[0]?.macroId ?? null) === macroId
    ) {
      end += 1;
    }

    rows.push({
      key: `macro-${macroId}-${index}`,
      label,
      start: index,
      end,
      macroId,
      className: "border-violet-300 bg-violet-100 text-violet-950",
    });

    index = end + 1;
  }

  return rows;
}

function getPrimaryEntry(column: WeekColumn): ColumnEntry | null {
  return column.entries[0] ?? null;
}

function getColumnWeekLabel(column: WeekColumn) {
  return column.entries[0]?.weekLabel || "Week";
}

function getColumnHref(column: WeekColumn) {
  return getPrimaryEntry(column)?.href || "#";
}

function findMeetColumnIndex(columns: WeekColumn[], meetDate: string) {
  if (columns.length === 0) return 0;

  let bestIndex = columns.length - 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < columns.length; index += 1) {
    const weekStart = columns[index]!.weekStart;
    if (!weekStart) continue;

    const distance = Math.abs(
      new Date(`${meetDate}T12:00:00`).getTime() -
        new Date(`${weekStart}T12:00:00`).getTime(),
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function getOrderedBlocks(
  macrocycles: TimelineMacrocycle[],
  orphanBlocks: TimelineBlock[],
): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];

  for (const macro of macrocycles) {
    for (const block of macro.blocks) {
      blocks.push(block);
    }
  }

  for (const block of orphanBlocks) {
    blocks.push(block);
  }

  return blocks;
}

function buildSequentialColumns(orderedBlocks: TimelineBlock[]): WeekColumn[] {
  const columns: WeekColumn[] = [];
  let timelineCursor: string | null = null;

  for (const block of orderedBlocks) {
    let effectiveStart = block.startDate;

    if (effectiveStart && timelineCursor && effectiveStart <= timelineCursor) {
      effectiveStart = addDaysToDateString(timelineCursor, 7);
    } else if (!effectiveStart && timelineCursor) {
      effectiveStart = addDaysToDateString(timelineCursor, 7);
    }

    for (const week of block.weeks) {
      const weekStart =
        effectiveStart !== null
          ? addDaysToDateString(effectiveStart, (week.weekNumber - 1) * 7)
          : week.startDate;

      columns.push({
        key: `${block.id}-${week.id}`,
        weekStart,
        entries: [
          {
            weekId: week.id,
            weekLabel: week.title,
            href: week.href,
            blockId: block.id,
            blockTitle: block.title,
            macroId: block.macrocycleId,
            macroTitle: block.macrocycleTitle,
          },
        ],
      });

      if (weekStart) {
        timelineCursor = weekStart;
      }
    }
  }

  return columns;
}

export default function ProgramPlanningCalendar({
  athleteId,
  athleteName,
  canEditNotes,
  coachId = "",
}: ProgramPlanningCalendarProps) {
  const [loading, setLoading] = useState(true);
  const [macrocycles, setMacrocycles] = useState<TimelineMacrocycle[]>([]);
  const [orphanBlocks, setOrphanBlocks] = useState<TimelineBlock[]>([]);
  const [meets, setMeets] = useState<TimelineMeet[]>([]);
  const [weekNotes, setWeekNotes] = useState<Record<string, string>>({});
  const [blockNotes, setBlockNotes] = useState<Record<string, string>>({});
  const [reloadToken, setReloadToken] = useState(0);
  const [addingMacro, setAddingMacro] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [addingWeekBlockId, setAddingWeekBlockId] = useState("");
  const [newMacroTitle, setNewMacroTitle] = useState("");
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockStartDate, setNewBlockStartDate] = useState("");
  const [newBlockMacroId, setNewBlockMacroId] = useState("");
  const [newWeekTitle, setNewWeekTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const reloadTimeline = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [macroRows, { data: blockRows }, competitions] = await Promise.all([
        loadProgramMacrocycles(athleteId),
        supabase
          .from("program_blocks")
          .select("id, title, start_date, macrocycle_id")
          .eq("athlete_id", athleteId)
          .order("start_date", { ascending: true }),
        loadAthleteUpcomingCompetitions(athleteId),
      ]);

      const macroTitleById = new Map(
        macroRows.map((macro) => [macro.id, macro.title]),
      );

      if (!blockRows?.length) {
        setMacrocycles([]);
        setOrphanBlocks([]);
        setMeets(
          competitions.map((competition) => ({
            id: competition.id,
            naam: competition.naam,
            startDate: competition.start_date,
            endDate: competition.end_date,
            columnIndex: 0,
          })),
        );
        setLoading(false);
        return;
      }

      const blockIds = blockRows.map((block) => block.id);
      const { data: weekRows } = await supabase
        .from("program_weeks")
        .select("id, title, week_number, program_block_id")
        .in("program_block_id", blockIds)
        .order("week_number", { ascending: true });

      const blocksById = new Map<string, TimelineBlock>();

      for (const block of blockRows) {
        blocksById.set(block.id, {
          id: block.id,
          title: block.title || "Block",
          startDate: block.start_date,
          macrocycleId: block.macrocycle_id,
          macrocycleTitle: block.macrocycle_id
            ? macroTitleById.get(block.macrocycle_id) || null
            : null,
          weeks: (weekRows || [])
            .filter((week) => week.program_block_id === block.id)
            .map((week) => {
              const weekStart = block.start_date
                ? (() => {
                    const dayDate = getProgramDayDate(
                      block.start_date,
                      week.week_number,
                      1,
                    );
                    return dayDate ? toLocalDateString(dayDate) : null;
                  })()
                : null;

              return {
                id: week.id,
                title: week.title || `Week ${week.week_number}`,
                weekNumber: week.week_number,
                startDate: weekStart,
                href: withPreserveWeekParam(
                  `/programs/${block.id}/weeks/${week.id}?athlete=${athleteId}`,
                ),
              };
            }),
        });
      }

      const grouped: TimelineMacrocycle[] = macroRows.map((macro) => ({
        id: macro.id,
        title: macro.title,
        blocks: blockRows
          .filter((block) => block.macrocycle_id === macro.id)
          .map((block) => blocksById.get(block.id)!)
          .filter(Boolean),
      }));

      const orphans = blockRows
        .filter((block) => !block.macrocycle_id)
        .map((block) => blocksById.get(block.id)!)
        .filter(Boolean);

      setMacrocycles(grouped);
      setOrphanBlocks(orphans);
      setLoading(false);
    }

    void load();
  }, [athleteId, reloadToken]);

  const allBlocks = useMemo(
    () => getOrderedBlocks(macrocycles, orphanBlocks),
    [macrocycles, orphanBlocks],
  );

  async function handleCreateMacrocycle() {
    if (!coachId || !newMacroTitle.trim()) return;
    setCreating(true);
    const { error } = await createProgramMacrocycle(
      athleteId,
      newMacroTitle,
      coachId,
      macrocycles.length,
    );
    setCreating(false);
    if (error) {
      alert(error.message);
      return;
    }
    setNewMacroTitle("");
    setAddingMacro(false);
    reloadTimeline();
  }

  async function handleCreateBlock() {
    if (!coachId || !newBlockTitle.trim() || !newBlockStartDate) return;
    setCreating(true);

    const { blockId, error } = await createProgramBlockForAthlete({
      athleteId,
      title: newBlockTitle.trim(),
      description: "",
      startDate: newBlockStartDate,
      macrocycleId: newBlockMacroId || null,
    });

    if (error || !blockId) {
      setCreating(false);
      alert(error || "Block kon niet worden aangemaakt");
      return;
    }

    setCreating(false);
    setNewBlockTitle("");
    setNewBlockStartDate("");
    setNewBlockMacroId("");
    setAddingBlock(false);
    reloadTimeline();
  }

  async function handleCreateWeek() {
    if (!coachId || !addingWeekBlockId || !newWeekTitle.trim()) return;

    const targetBlock = allBlocks.find((block) => block.id === addingWeekBlockId);
    const nextWeekNumber =
      targetBlock && targetBlock.weeks.length > 0
        ? Math.max(...targetBlock.weeks.map((week) => week.weekNumber)) + 1
        : 1;

    setCreating(true);
    const { error } = await createProgramWeekForBlock({
      blockId: addingWeekBlockId,
      title: newWeekTitle.trim(),
      weekNumber: nextWeekNumber,
    });
    setCreating(false);

    if (error) {
      alert(error);
      return;
    }

    setNewWeekTitle("");
    setAddingWeekBlockId("");
    reloadTimeline();
  }

  const columns = useMemo(
    () => buildSequentialColumns(getOrderedBlocks(macrocycles, orphanBlocks)),
    [macrocycles, orphanBlocks],
  );

  const weekIds = useMemo(
    () => columns.flatMap((column) => column.entries.map((entry) => entry.weekId)),
    [columns],
  );

  const blockIds = useMemo(() => {
    const ids = new Set<string>();
    for (const column of columns) {
      for (const entry of column.entries) {
        ids.add(entry.blockId);
      }
    }
    return [...ids];
  }, [columns]);

  useEffect(() => {
    async function loadNotes() {
      if (weekIds.length === 0 && blockIds.length === 0) {
        setWeekNotes({});
        setBlockNotes({});
        return;
      }

      const { data } = await loadProgramPlanningNotes(athleteId, weekIds, blockIds);
      setWeekNotes(data.weekNotes);
      setBlockNotes(data.blockNotes);
    }

    if (!loading) {
      void loadNotes();
    }
  }, [athleteId, weekIds, blockIds, loading]);

  const saveWeekNote = useCallback(
    async (programWeekId: string, note: string) => {
      if (!canEditNotes || !coachId) return;

      const { error } = await saveProgramPlanningWeekNote({
        programWeekId,
        athleteId,
        coachId,
        note,
      });

      if (!error) {
        setWeekNotes((current) => {
          const next = { ...current };
          if (note.trim()) {
            next[programWeekId] = note.trim();
          } else {
            delete next[programWeekId];
          }
          return next;
        });
      }
    },
    [athleteId, canEditNotes, coachId],
  );

  const saveBlockNote = useCallback(
    async (programBlockId: string, note: string) => {
      if (!canEditNotes || !coachId) return;

      const { error } = await saveProgramPlanningBlockNote({
        programBlockId,
        athleteId,
        coachId,
        note,
      });

      if (!error) {
        setBlockNotes((current) => {
          const next = { ...current };
          if (note.trim()) {
            next[programBlockId] = note.trim();
          } else {
            delete next[programBlockId];
          }
          return next;
        });
      }
    },
    [athleteId, canEditNotes, coachId],
  );

  const blockColorIndex = useMemo(() => buildBlockColorIndex(columns), [columns]);
  const blockRows = useMemo(
    () => buildBlockRows(columns, blockColorIndex),
    [columns, blockColorIndex],
  );
  const macroRows = useMemo(() => buildMacroRows(columns), [columns]);
  const { meetColumnIndices, meetNamesByColumn, meetsByColumn } = useMemo(
    () => getMeetColumns(columns, meets),
    [columns, meets],
  );
  const todayMarker = useMemo(() => getTodayMarker(columns), [columns]);

  useEffect(() => {
    async function loadMeets() {
      const competitions = await loadAthleteUpcomingCompetitions(athleteId);
      setMeets(
        competitions.map((competition) => ({
          id: competition.id,
          naam: competition.naam,
          startDate: competition.start_date,
          endDate: competition.end_date,
          columnIndex: findMeetColumnIndex(columns, competition.start_date),
        })),
      );
    }

    if (!loading) {
      void loadMeets();
    }
  }, [athleteId, columns, loading]);

  const columnCount = Math.max(columns.length, 1);
  const gridTemplateColumns = `${LABEL_COL_WIDTH} repeat(${columnCount}, ${WEEK_COL_WIDTH}px)`;
  const gridMinWidth = 80 + columnCount * WEEK_COL_WIDTH;

  function weekGridColumn(startIndex: number, endIndex: number) {
    return `${startIndex + 2} / ${endIndex + 3}`;
  }

  if (loading) {
    return <p className="text-sm text-app-muted">Planning laden...</p>;
  }

  if (columns.length === 0 && meets.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-app-text">Planning — {athleteName}</h2>
        <p className="text-sm text-app-muted">Nog geen programma of wedstrijden gepland.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-app-text">Planning — {athleteName}</h2>
        <p className="mt-1 text-sm text-app-muted">
          Elke kolom is één week. Boven: weken, daaronder blocks en macrocycles.
        </p>
      </div>

      {canEditNotes && coachId ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAddingMacro((open) => !open);
              setAddingBlock(false);
              setAddingWeekBlockId("");
            }}
            className="rounded-xl border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900"
          >
            + Macrocycle
          </button>
          <button
            type="button"
            onClick={() => {
              setAddingBlock((open) => !open);
              setAddingMacro(false);
              setAddingWeekBlockId("");
            }}
            className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900"
          >
            + Block
          </button>
          <button
            type="button"
            onClick={() => {
              setAddingWeekBlockId((current) => (current ? "" : allBlocks[0]?.id || ""));
              setAddingMacro(false);
              setAddingBlock(false);
            }}
            disabled={allBlocks.length === 0}
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-40"
          >
            + Week
          </button>
        </div>
      ) : null}

      {addingMacro ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 p-3">
          <input
            value={newMacroTitle}
            onChange={(event) => setNewMacroTitle(event.target.value)}
            placeholder="Naam macrocycle"
            className="min-w-[180px] flex-1 rounded-xl border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreateMacrocycle()}
            className="rounded-xl bg-violet-700 px-3 py-2 text-xs font-semibold text-white"
          >
            Opslaan
          </button>
        </div>
      ) : null}

      {addingBlock ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3">
          <input
            value={newBlockTitle}
            onChange={(event) => setNewBlockTitle(event.target.value)}
            placeholder="Blocknaam"
            className="min-w-[140px] rounded-xl border px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={newBlockStartDate}
            onChange={(event) => setNewBlockStartDate(event.target.value)}
            className="rounded-xl border px-3 py-2 text-sm"
          />
          <select
            value={newBlockMacroId}
            onChange={(event) => setNewBlockMacroId(event.target.value)}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="">Geen macrocycle</option>
            {macrocycles.map((macro) => (
              <option key={macro.id} value={macro.id}>
                {macro.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreateBlock()}
            className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white"
          >
            Opslaan
          </button>
        </div>
      ) : null}

      {addingWeekBlockId ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <select
            value={addingWeekBlockId}
            onChange={(event) => setAddingWeekBlockId(event.target.value)}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            {allBlocks.map((block) => (
              <option key={block.id} value={block.id}>
                {block.title}
              </option>
            ))}
          </select>
          <input
            value={newWeekTitle}
            onChange={(event) => setNewWeekTitle(event.target.value)}
            placeholder="Weeknaam"
            className="min-w-[140px] rounded-xl border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreateWeek()}
            className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
          >
            Opslaan
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto pb-2 pt-6">
        <div className="relative min-w-max">
          {todayMarker ? (
            <div
              className="pointer-events-none absolute inset-y-0 z-20"
              style={{ left: todayMarker.left }}
            >
              <div className={`h-full w-0.5 ${TODAY_LINE_CLASS}`} />
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                {todayMarker.label}
              </span>
            </div>
          ) : null}

          <div
            className="relative grid rounded-2xl border border-app-border bg-app-surface"
            style={{
              gridTemplateColumns,
              minWidth: gridMinWidth,
            }}
          >
            <div
              className="flex items-end border-b border-r border-app-border bg-app-surface px-2 py-2 text-[10px] font-bold uppercase text-app-muted"
              style={{ gridRow: 1, gridColumn: 1 }}
            >
              Week
            </div>
            {columns.map((column, index) => {
              const isMeetColumn = meetColumnIndices.has(index);
              const weekLabel = getColumnWeekLabel(column);
              const entry = column.entries[0];
              if (!entry) return null;

              const weekSections = [
                {
                  key: entry.weekId,
                  note: weekNotes[entry.weekId] || "",
                  onSave: canEditNotes
                    ? (note: string) => saveWeekNote(entry.weekId, note)
                    : undefined,
                },
              ];

              return (
                <PlanningHoverNote
                  key={column.key}
                  title="Weeknotitie"
                  canEdit={canEditNotes}
                  sections={weekSections}
                  className="min-h-[72px]"
                  style={{ gridRow: 1, gridColumn: index + 2 }}
                >
                  <Link
                    href={getColumnHref(column)}
                    className={`flex min-h-[72px] flex-col items-center justify-center border-b border-r border-app-border px-1 py-2 text-center hover:opacity-90 ${
                      isMeetColumn
                        ? MEET_COLUMN_CLASS
                        : "bg-app-surface-muted hover:bg-app-accent/5"
                    }`}
                    title={weekLabel}
                  >
                    <span className="line-clamp-2 text-[11px] font-semibold">
                      {weekLabel}
                    </span>
                    {column.weekStart ? (
                      <span className="mt-1 text-[10px] opacity-80">
                        {formatPlanningWeekDate(column.weekStart)}
                      </span>
                    ) : null}
                  </Link>
                </PlanningHoverNote>
              );
            })}

            <div
              className="flex items-center border-b border-r border-app-border px-2 py-2 text-[10px] font-bold uppercase text-blue-400"
              style={{ gridRow: 2, gridColumn: 1 }}
            >
              Blocks
            </div>
            {columns.map((column, index) => {
              const isMeetColumn = meetColumnIndices.has(index);

              return (
                <div
                  key={`block-bg-${column.key}`}
                  className={`h-10 border-b border-r border-app-border ${
                    isMeetColumn
                      ? MEET_COLUMN_CLASS
                      : `${getColumnBlockColor(column, blockColorIndex).border} ${getColumnBlockColor(column, blockColorIndex).bg}`
                  }`}
                  style={{ gridRow: 2, gridColumn: index + 2 }}
                />
              );
            })}
            {blockRows.map((row) => (
              <PlanningHoverNote
                key={row.key}
                title="Blocknotitie"
                canEdit={canEditNotes}
                placement="above"
                sections={[
                  {
                    key: row.blockId!,
                    note: blockNotes[row.blockId!] || "",
                    onSave: canEditNotes
                      ? (note: string) => saveBlockNote(row.blockId!, note)
                      : undefined,
                  },
                ]}
                className="pointer-events-auto z-10 h-10"
                style={{
                  gridRow: 2,
                  gridColumn: weekGridColumn(row.start, row.end),
                }}
              >
                <div
                  className="flex h-full w-full items-center justify-center overflow-hidden bg-transparent px-2 text-center text-[11px] font-semibold"
                  title={row.label}
                >
                  <span
                    className={`truncate ${getBlockColor(blockColorIndex.get(row.blockId!) ?? 0).text}`}
                  >
                    {row.label}
                  </span>
                </div>
              </PlanningHoverNote>
            ))}

            <div
              className="flex items-center border-b border-r border-app-border px-2 py-2 text-[10px] font-bold uppercase text-app-accent"
              style={{ gridRow: 3, gridColumn: 1 }}
            >
              Macro
            </div>
            {columns.map((column, index) => {
              const isMeetColumn = meetColumnIndices.has(index);
              const primary = getPrimaryEntry(column);
              const macroClassName = primary?.macroId
                ? "border-violet-300 bg-violet-100"
                : "border-dashed border-app-border bg-app-surface-muted text-app-muted";

              return (
                <div
                  key={`macro-bg-${column.key}`}
                  className={`flex h-10 items-center justify-center border-b border-r border-app-border text-[11px] ${
                    isMeetColumn ? MEET_COLUMN_CLASS : macroClassName
                  }`}
                  style={{ gridRow: 3, gridColumn: index + 2 }}
                >
                  {!primary?.macroId && !isMeetColumn ? "—" : null}
                </div>
              );
            })}
            {macroRows.map((row) => (
              <div
                key={row.key}
                className="pointer-events-none z-10 flex h-10 items-center justify-center overflow-hidden px-2 text-center text-[11px] font-semibold text-violet-950"
                style={{
                  gridRow: 3,
                  gridColumn: weekGridColumn(row.start, row.end),
                }}
                title={row.label}
              >
                <span className="truncate">{row.label}</span>
              </div>
            ))}

            {meetColumnIndices.size > 0 ? (
              <>
                <div
                  className="flex items-center border-r border-app-border px-2 py-2 text-[10px] font-bold uppercase text-amber-400"
                  style={{ gridRow: 4, gridColumn: 1 }}
                >
                  Meet
                </div>
                {columns.map((column, index) => {
                  const columnMeets = meetsByColumn.get(index);
                  if (!columnMeets?.length) {
                    return (
                      <div
                        key={`meet-empty-${column.key}`}
                        className="h-10 border-r border-gray-200 bg-app-surface"
                        style={{ gridRow: 4, gridColumn: index + 2 }}
                      />
                    );
                  }

                  const primaryMeet = columnMeets[0]!;
                  const meetLabel = meetNamesByColumn.get(index)?.join(", ") || primaryMeet.naam;

                  return (
                    <Link
                      key={`meet-${column.key}`}
                      href={getMeetWeekHref(athleteId, primaryMeet.id)}
                      className={`flex h-10 items-center justify-center border-r border-app-border px-1 text-center text-[10px] font-semibold transition-colors ${MEET_COLUMN_CLASS}`}
                      style={{ gridRow: 4, gridColumn: index + 2 }}
                      title={`${meetLabel} — open meet-week hub`}
                    >
                      <span className="line-clamp-2 underline-offset-2 hover:underline">
                        {meetLabel}
                      </span>
                    </Link>
                  );
                })}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
