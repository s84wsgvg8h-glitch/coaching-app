import {
  loadProgramWeekCore,
  type ProgramWeekCoreData,
} from "@/lib/programWeekCoreLoader";
import {
  getStoredProgramWeek,
  saveStoredProgramWeek,
} from "@/lib/programWeekLocalStore";
import { isOfflineEnvironment } from "@/lib/offlineNetwork";
import { supabase } from "@/lib/supabaseClient";
import type { ProgramWeek } from "@/lib/programWeek/types";

export async function loadProgramWeekCoreCached(
  blockId: string,
  weekId: string,
  options?: { userId?: string; role?: string },
): Promise<{ data: ProgramWeekCoreData; fromCache: boolean }> {
  const local = await getStoredProgramWeek(blockId, weekId);

  if (typeof window === "undefined") {
    const data = await loadProgramWeekCore(blockId, weekId, options);
    return { data, fromCache: false };
  }

  if (isOfflineEnvironment()) {
    if (local?.data) {
      return { data: local.data, fromCache: true };
    }
    throw new Error("Programma niet offline beschikbaar. Open het eerst online.");
  }

  try {
    const data = await loadProgramWeekCore(blockId, weekId, options);
    await saveStoredProgramWeek(blockId, weekId, data);
    return { data, fromCache: false };
  } catch (error) {
    if (local?.data) {
      return { data: local.data, fromCache: true };
    }
    throw error;
  }
}

export async function cacheProgramWeekCore(
  blockId: string,
  weekId: string,
  options?: { userId?: string; role?: string },
) {
  const { data } = await loadProgramWeekCoreCached(blockId, weekId, options);
  return data;
}

export async function cacheAllWeeksForBlock(
  blockId: string,
  options?: { userId?: string; role?: string },
) {
  const { data: weeks, error } = await supabase
    .from("program_weeks")
    .select("id")
    .eq("program_block_id", blockId)
    .order("week_number", { ascending: true });

  if (error || !weeks?.length) return;

  for (const week of weeks as Pick<ProgramWeek, "id">[]) {
    try {
      await cacheProgramWeekCore(blockId, week.id, options);
    } catch {
      // Continue caching remaining weeks.
    }
  }
}

export async function cacheAthleteProgramsOffline(
  athleteId: string,
  options?: { userId?: string; role?: string },
) {
  const { data: blocks, error } = await supabase
    .from("program_blocks")
    .select("id")
    .eq("athlete_id", athleteId)
    .order("start_date", { ascending: true });

  if (error || !blocks?.length) return;

  for (const block of blocks) {
    await cacheAllWeeksForBlock(block.id as string, options);
  }
}

export async function persistProgramWeekSnapshot(
  blockId: string,
  weekId: string,
  data: ProgramWeekCoreData,
) {
  await saveStoredProgramWeek(blockId, weekId, data);
}
