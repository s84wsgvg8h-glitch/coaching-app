import { supabase } from "@/lib/supabaseClient";

export type InjuryUrgency = "laag" | "medium" | "hoog";

export type AthleteInjury = {
  id: string;
  athlete_id: string;
  muscle_area_id: string;
  name: string;
  injury_date: string;
  urgency: InjuryUrgency;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NewAthleteInjury = {
  athlete_id: string;
  muscle_area_id: string;
  name: string;
  injury_date: string;
  urgency: InjuryUrgency;
  created_by?: string | null;
};

const LOCAL_STORAGE_PREFIX = "athlete-injuries:";

function getLocalStorageKey(athleteId: string) {
  return `${LOCAL_STORAGE_PREFIX}${athleteId}`;
}

function readLocalInjuries(athleteId: string): AthleteInjury[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(athleteId));
    return raw ? (JSON.parse(raw) as AthleteInjury[]) : [];
  } catch {
    return [];
  }
}

function writeLocalInjuries(athleteId: string, injuries: AthleteInjury[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getLocalStorageKey(athleteId), JSON.stringify(injuries));
}

export const INJURY_URGENCY_OPTIONS: Array<{
  value: InjuryUrgency;
  label: string;
}> = [
  { value: "laag", label: "Laag" },
  { value: "medium", label: "Medium" },
  { value: "hoog", label: "Hoog" },
];

export function getInjuryUrgencyLabel(urgency: InjuryUrgency) {
  return INJURY_URGENCY_OPTIONS.find((option) => option.value === urgency)?.label || urgency;
}

export function getHighestUrgencyForArea(
  injuries: AthleteInjury[],
  muscleAreaId: string,
): InjuryUrgency | null {
  const areaInjuries = injuries.filter(
    (injury) => injury.muscle_area_id === muscleAreaId,
  );

  if (areaInjuries.length === 0) return null;
  if (areaInjuries.some((injury) => injury.urgency === "hoog")) return "hoog";
  if (areaInjuries.some((injury) => injury.urgency === "medium")) return "medium";
  return "laag";
}

export async function loadAthleteInjuries(athleteId: string) {
  const { data, error } = await supabase
    .from("athlete_injuries")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("injury_date", { ascending: false });

  if (error) {
    return { data: readLocalInjuries(athleteId), error: null, source: "local" as const };
  }

  return { data: (data || []) as AthleteInjury[], error: null, source: "remote" as const };
}

export async function createAthleteInjury(input: NewAthleteInjury) {
  const now = new Date().toISOString();
  const payload = {
    athlete_id: input.athlete_id,
    muscle_area_id: input.muscle_area_id,
    name: input.name.trim(),
    injury_date: input.injury_date,
    urgency: input.urgency,
    created_by: input.created_by ?? null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("athlete_injuries")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    const localInjury: AthleteInjury = {
      id: crypto.randomUUID(),
      created_at: now,
      ...payload,
    };
    const existing = readLocalInjuries(input.athlete_id);
    writeLocalInjuries(input.athlete_id, [localInjury, ...existing]);
    return { data: localInjury, error: null, source: "local" as const };
  }

  return { data: data as AthleteInjury, error: null, source: "remote" as const };
}

export async function deleteAthleteInjury(athleteId: string, injuryId: string) {
  const { error } = await supabase
    .from("athlete_injuries")
    .delete()
    .eq("id", injuryId)
    .eq("athlete_id", athleteId);

  if (error) {
    const next = readLocalInjuries(athleteId).filter((injury) => injury.id !== injuryId);
    writeLocalInjuries(athleteId, next);
    return { error: null, source: "local" as const };
  }

  return { error: null, source: "remote" as const };
}
