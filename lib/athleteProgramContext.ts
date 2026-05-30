import { supabase } from "@/lib/supabaseClient";

export type AthleteProgramPosition = {
  blockTitle: string;
  blockNumber: number;
  weekTitle: string;
  weekNumber: number;
  label: string;
};

function parseBlockNumber(title: string) {
  const match = title.match(/block\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function toDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function loadAthleteProgramPosition(
  athleteId: string,
): Promise<AthleteProgramPosition | null> {
  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, title, start_date")
    .eq("athlete_id", athleteId)
    .order("start_date", { ascending: true });

  if (blocksError || !blocks || blocks.length === 0) {
    return null;
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let currentBlock =
    [...blocks]
      .reverse()
      .find((block) => {
        const start = toDateOnly(block.start_date);
        return start ? start <= today : false;
      }) || blocks[blocks.length - 1];

  const { data: weeks, error: weeksError } = await supabase
    .from("program_weeks")
    .select("id, title, week_number")
    .eq("program_block_id", currentBlock.id)
    .order("week_number", { ascending: true });

  if (weeksError || !weeks || weeks.length === 0) {
    const blockNumber =
      parseBlockNumber(currentBlock.title || "") ||
      blocks.findIndex((block) => block.id === currentBlock.id) + 1;

    return {
      blockTitle: currentBlock.title || "Block",
      blockNumber,
      weekTitle: "Week",
      weekNumber: 1,
      label: `Block ${blockNumber}`,
    };
  }

  const blockStart = toDateOnly(currentBlock.start_date);
  let currentWeek = weeks[0];

  if (blockStart) {
    const diffDays = Math.floor(
      (today.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const weekIndex = Math.max(0, Math.floor(diffDays / 7));
    currentWeek = weeks[Math.min(weekIndex, weeks.length - 1)];
  } else {
    currentWeek = weeks[weeks.length - 1];
  }

  const blockNumber =
    parseBlockNumber(currentBlock.title || "") ||
    blocks.findIndex((block) => block.id === currentBlock.id) + 1;

  return {
    blockTitle: currentBlock.title || "Block",
    blockNumber,
    weekTitle: currentWeek.title || `Week ${currentWeek.week_number}`,
    weekNumber: currentWeek.week_number,
    label: `Block ${blockNumber} · Week ${currentWeek.week_number}`,
  };
}
