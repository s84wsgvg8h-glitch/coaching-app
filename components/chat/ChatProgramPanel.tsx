"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";
import {
  appendProgramWeekQueryParams,
  buildProgramWeekPath,
  resolveProgramEntryForAthlete,
  resolveProgramEntryFromBlockId,
  withPreserveWeekParam,
} from "@/lib/programNavigation";

type ProgramBlock = {
  id: string;
  title: string;
  start_date: string | null;
};

type ProgramWeek = {
  id: string;
  title: string;
  week_number: number;
  program_block_id: string;
};

type ChatProgramPanelProps = {
  athleteId: string;
  athleteName: string;
  coachId: string;
  onClose: () => void;
};

export default function ChatProgramPanel({
  athleteId,
  athleteName,
  coachId,
  onClose,
}: ChatProgramPanelProps) {
  const [blocks, setBlocks] = useState<ProgramBlock[]>([]);
  const [weeksByBlock, setWeeksByBlock] = useState<Record<string, ProgramWeek[]>>(
    {},
  );
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProgramNavigation() {
      setLoading(true);
      setError("");

      const { data: blocksData, error: blocksError } = await supabase
        .from("program_blocks")
        .select("id, title, start_date")
        .eq("athlete_id", athleteId)
        .order("start_date", { ascending: true });

      if (cancelled) return;

      if (blocksError) {
        setError(blocksError.message);
        setLoading(false);
        return;
      }

      const loadedBlocks = (blocksData || []) as ProgramBlock[];
      setBlocks(loadedBlocks);

      if (loadedBlocks.length === 0) {
        setWeeksByBlock({});
        setSelectedBlockId("");
        setSelectedWeekId("");
        setLoading(false);
        return;
      }

      const blockIds = loadedBlocks.map((block) => block.id);
      const { data: weeksData, error: weeksError } = await supabase
        .from("program_weeks")
        .select("id, title, week_number, program_block_id")
        .in("program_block_id", blockIds)
        .order("week_number", { ascending: true });

      if (cancelled) return;

      if (weeksError) {
        setError(weeksError.message);
        setLoading(false);
        return;
      }

      const grouped: Record<string, ProgramWeek[]> = {};
      loadedBlocks.forEach((block) => {
        grouped[block.id] = [];
      });

      (weeksData || []).forEach((week) => {
        if (!grouped[week.program_block_id]) {
          grouped[week.program_block_id] = [];
        }
        grouped[week.program_block_id].push(week as ProgramWeek);
      });

      setWeeksByBlock(grouped);

      const { data: entry } = await resolveProgramEntryForAthlete(
        athleteId,
        coachId,
      );

      const initialBlockId = entry?.blockId || loadedBlocks[0]?.id || "";
      const initialWeekId =
        entry?.weekId || grouped[initialBlockId]?.[0]?.id || "";

      setSelectedBlockId(initialBlockId);
      setSelectedWeekId(initialWeekId);
      setLoading(false);
    }

    void loadProgramNavigation();

    return () => {
      cancelled = true;
    };
  }, [athleteId, coachId]);

  const weeksForSelectedBlock = useMemo(
    () => weeksByBlock[selectedBlockId] || [],
    [selectedBlockId, weeksByBlock],
  );

  const iframeSrc =
    selectedBlockId && selectedWeekId
      ? appendProgramWeekQueryParams(
          withPreserveWeekParam(
            buildProgramWeekPath(
              {
                blockId: selectedBlockId,
                weekId: selectedWeekId,
                athleteId,
              },
              { coachViewingAthlete: true },
            ),
          ),
          { embedded: "chat" },
        )
      : "";

  function handleBlockChange(blockId: string) {
    setSelectedBlockId(blockId);

    void (async () => {
      const { data: entry } = await resolveProgramEntryFromBlockId(
        blockId,
        athleteId,
      );

      if (entry?.weekId) {
        setSelectedWeekId(entry.weekId);
        return;
      }

      const weeks = weeksByBlock[blockId] || [];
      setSelectedWeekId(weeks[0]?.id || "");
    })();
  }

  function handleWeekChange(weekId: string) {
    setSelectedWeekId(weekId);
  }

  return (
    <aside className={CHAT_SIDE_PANEL_CLASS}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-app-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate chat-panel-title truncate">Programma</h3>
          <p className="truncate chat-panel-subtitle truncate">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-app-muted hover:bg-app-surface-hover hover:text-app-text"
          aria-label="Programma sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-app-border px-3 py-3">
        <div className="min-w-0">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-app-subtle">
            Block
          </label>
          <select
            value={selectedBlockId}
            onChange={(event) => handleBlockChange(event.target.value)}
            disabled={loading || blocks.length === 0}
            className="w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm font-semibold text-app-text outline-none"
          >
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>
                {block.title || "Block"}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-app-subtle">
            Week
          </label>
          <select
            value={selectedWeekId}
            onChange={(event) => handleWeekChange(event.target.value)}
            disabled={loading || weeksForSelectedBlock.length === 0}
            className="w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm font-semibold text-app-text outline-none"
          >
            {weeksForSelectedBlock.map((week) => (
              <option key={week.id} value={week.id}>
                {week.title || `Week ${week.week_number}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-app-surface-hover">
        {loading && (
          <div className="flex h-full items-center justify-center text-sm text-app-muted">
            Programma laden...
          </div>
        )}

        {!loading && error && (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-app-destructive">
            {error}
          </div>
        )}

        {!loading && !error && blocks.length === 0 && (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-app-muted">
            Nog geen programma voor deze atleet.
          </div>
        )}

        {!loading && !error && iframeSrc && (
          <iframe
            key={iframeSrc}
            title={`Programma ${athleteName}`}
            src={iframeSrc}
            className="h-full w-full border-0 bg-app-surface-hover"
          />
        )}
      </div>
    </aside>
  );
}
