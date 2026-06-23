"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getProgramDayDate } from "@/lib/athleteFillScore";

type ProgramTimelinePanelProps = {
  athleteId: string;
  athleteName: string;
};

type TimelineBlock = {
  id: string;
  title: string;
  start_date: string | null;
  weeks: Array<{
    id: string;
    title: string;
    week_number: number;
    startDate: string | null;
  }>;
};

export default function ProgramTimelinePanel({
  athleteId,
  athleteName,
}: ProgramTimelinePanelProps) {
  const [blocks, setBlocks] = useState<TimelineBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: blockRows } = await supabase
        .from("program_blocks")
        .select("id, title, start_date")
        .eq("athlete_id", athleteId)
        .order("start_date", { ascending: true });

      if (!blockRows?.length) {
        setBlocks([]);
        setLoading(false);
        return;
      }

      const blockIds = blockRows.map((b) => b.id);
      const { data: weekRows } = await supabase
        .from("program_weeks")
        .select("id, title, week_number, program_block_id")
        .in("program_block_id", blockIds)
        .order("week_number", { ascending: true });

      const timeline: TimelineBlock[] = blockRows.map((block) => ({
        id: block.id,
        title: block.title || "Block",
        start_date: block.start_date,
        weeks: (weekRows || [])
          .filter((w) => w.program_block_id === block.id)
          .map((week) => ({
            id: week.id,
            title: week.title || `Week ${week.week_number}`,
            week_number: week.week_number,
            startDate: block.start_date
              ? getProgramDayDate(block.start_date, week.week_number, 1)
                  ?.toISOString()
                  .slice(0, 10) ?? null
              : null,
          })),
      }));

      setBlocks(timeline);
      setLoading(false);
    }

    void load();
  }, [athleteId]);

  if (loading) {
    return (
      <div className="app-card mb-6">
        <p className="text-sm text-app-muted">Timeline laden...</p>
      </div>
    );
  }

  if (blocks.length === 0) return null;

  return (
    <div className="app-card mb-6">
      <h2 className="text-lg font-bold text-app-text">
        Programma timeline — {athleteName}
      </h2>
      <p className="mt-1 text-sm text-app-muted">
        Blocks en weken met startdatums voordat je een week opent.
      </p>

      <div className="mt-4 space-y-4">
        {blocks.map((block) => (
          <div key={block.id}>
            <p className="font-semibold text-app-text">
              {block.title}
              {block.start_date ? (
                <span className="ml-2 text-xs font-normal text-app-muted">
                  start {block.start_date}
                </span>
              ) : null}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {block.weeks.map((week) => (
                <li key={week.id}>
                  <Link
                    href={`/programs/${block.id}/weeks/${week.id}?athlete=${athleteId}`}
                    className="inline-block rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text hover:border-brand-purple hover:text-brand-purple"
                  >
                    {week.title}
                    {week.startDate ? ` · ${week.startDate}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
