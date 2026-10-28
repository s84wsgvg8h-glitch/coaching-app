import { idbGet, idbSet } from "@/lib/idbClient";
import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";
import type { ProgramMacrocycle } from "@/lib/programMacrocycles";

export type StoredProgramNavigation = {
  key: string;
  ownerAthleteId: string;
  cachedAt: string;
  navBlocks: ProgramBlock[];
  weeksByBlock: Record<string, ProgramWeek[]>;
  navMacrocycles: ProgramMacrocycle[];
};

function navKey(ownerAthleteId: string) {
  return ownerAthleteId;
}

export async function getStoredProgramNavigation(ownerAthleteId: string) {
  if (!ownerAthleteId) return null;
  return idbGet<StoredProgramNavigation>("programNav", navKey(ownerAthleteId));
}

export async function saveStoredProgramNavigation(
  ownerAthleteId: string,
  payload: Omit<StoredProgramNavigation, "key" | "ownerAthleteId" | "cachedAt">,
) {
  if (!ownerAthleteId) return;
  await idbSet<StoredProgramNavigation>("programNav", navKey(ownerAthleteId), {
    key: navKey(ownerAthleteId),
    ownerAthleteId,
    cachedAt: new Date().toISOString(),
    ...payload,
  });
}
