import { supabase } from "@/lib/supabaseClient";

export type AthleteProgramAlert = {
  athleteId: string;
  athleteName: string;
  blockId: string;
  blockTitle: string;
  endDate: string;
  daysPastEnd: number;
};

function toDateOnly(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getBlockEndDate(startDate: string, weekCount: number) {
  const start = toDateOnly(startDate);
  if (!start || weekCount <= 0) return null;

  const end = new Date(start);
  end.setDate(end.getDate() + weekCount * 7 - 1);
  return end;
}

export async function loadAthletesNeedingNewProgram(
  coachId: string,
  isAdmin = false,
): Promise<AthleteProgramAlert[]> {
  let athletesQuery = supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "atleet")
    .order("full_name", { ascending: true });

  if (!isAdmin) {
    athletesQuery = athletesQuery.eq("coach_id", coachId);
  }

  const { data: athletes, error: athletesError } = await athletesQuery;
  if (athletesError || !athletes?.length) return [];

  const athleteIds = athletes.map((athlete) => athlete.id);

  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, athlete_id, title, start_date")
    .in("athlete_id", athleteIds)
    .order("start_date", { ascending: true });

  if (blocksError || !blocks?.length) return [];

  const blockIds = blocks.map((block) => block.id);
  const { data: weeks, error: weeksError } = await supabase
    .from("program_weeks")
    .select("id, program_block_id")
    .in("program_block_id", blockIds);

  if (weeksError) return [];

  const weekCountByBlock = new Map<string, number>();
  for (const week of weeks || []) {
    weekCountByBlock.set(
      week.program_block_id,
      (weekCountByBlock.get(week.program_block_id) || 0) + 1,
    );
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const alerts: AthleteProgramAlert[] = [];

  for (const athlete of athletes) {
    const athleteBlocks = (blocks || []).filter(
      (block) => block.athlete_id === athlete.id,
    );
    if (athleteBlocks.length === 0) continue;

    const currentBlock =
      [...athleteBlocks]
        .reverse()
        .find((block) => {
          const start = toDateOnly(block.start_date);
          return start ? start <= today : false;
        }) || athleteBlocks[athleteBlocks.length - 1];

    const weekCount = weekCountByBlock.get(currentBlock.id) || 0;
    const endDate = getBlockEndDate(currentBlock.start_date, weekCount);
    if (!endDate || endDate >= today) continue;

    const daysPastEnd = Math.floor(
      (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    alerts.push({
      athleteId: athlete.id,
      athleteName: athlete.full_name || "Naamloos",
      blockId: currentBlock.id,
      blockTitle: currentBlock.title || "Block",
      endDate: endDate.toISOString().slice(0, 10),
      daysPastEnd,
    });
  }

  return alerts.sort((a, b) => b.daysPastEnd - a.daysPastEnd);
}

export function programAlertAutoKey(athleteId: string, blockId: string) {
  return `program:${athleteId}:${blockId}`;
}
