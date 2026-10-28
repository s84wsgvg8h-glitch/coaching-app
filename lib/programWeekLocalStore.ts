import { idbDelete, idbGet, idbSet } from "@/lib/idbClient";
import type { ProgramWeekCoreData } from "@/lib/programWeekCoreLoader";

export type StoredProgramWeek = {
  key: string;
  blockId: string;
  weekId: string;
  cachedAt: string;
  data: ProgramWeekCoreData;
};

function weekKey(blockId: string, weekId: string) {
  return `${blockId}:${weekId}`;
}

export async function getStoredProgramWeek(
  blockId: string,
  weekId: string,
): Promise<StoredProgramWeek | null> {
  return idbGet<StoredProgramWeek>("programWeeks", weekKey(blockId, weekId));
}

export async function saveStoredProgramWeek(
  blockId: string,
  weekId: string,
  data: ProgramWeekCoreData,
) {
  const key = weekKey(blockId, weekId);
  await idbSet<StoredProgramWeek>("programWeeks", key, {
    key,
    blockId,
    weekId,
    cachedAt: new Date().toISOString(),
    data,
  });
}

export async function deleteStoredProgramWeek(blockId: string, weekId: string) {
  await idbDelete("programWeeks", weekKey(blockId, weekId));
}
