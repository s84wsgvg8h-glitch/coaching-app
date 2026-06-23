import { supabase } from "@/lib/supabaseClient";

export const BLOCK_INTAKE_STEPS = [
  {
    key: "status",
    title: "Hoe voel je je?",
    prompt: "Kort je huidige status (slaap, stress, pijn).",
  },
  {
    key: "focus",
    title: "Focus dit block",
    prompt: "Waar wil je op focussen de komende weken?",
  },
  {
    key: "weight_class",
    title: "Gewichtsklasse",
    prompt: "Doelgewicht of gewichtsklasse voor wedstrijden.",
  },
  {
    key: "limitations",
    title: "Beperkingen",
    prompt: "Blessures of oefeningen die je wilt vermijden.",
  },
  {
    key: "notes",
    title: "Overig",
    prompt: "Alles wat je coach moet weten.",
  },
] as const;

export type BlockIntakeWizard = {
  id: string;
  athlete_id: string;
  program_block_id: string;
  step: number;
  answers: Record<string, string>;
  completed_at: string | null;
  coach_reviewed_at: string | null;
};

export async function ensureBlockIntakeWizard(
  athleteId: string,
  programBlockId: string,
) {
  const { data: existing } = await supabase
    .from("block_intake_wizard")
    .select("*")
    .eq("program_block_id", programBlockId)
    .maybeSingle();

  if (existing) {
    return { data: existing as BlockIntakeWizard, error: null };
  }

  const { data, error } = await supabase
    .from("block_intake_wizard")
    .insert({
      athlete_id: athleteId,
      program_block_id: programBlockId,
      step: 1,
      answers: {},
    })
    .select("*")
    .single();

  return { data: (data || null) as BlockIntakeWizard | null, error };
}

export async function loadBlockIntakeForAthlete(athleteId: string) {
  const { data, error } = await supabase
    .from("block_intake_wizard")
    .select("*")
    .eq("athlete_id", athleteId)
    .is("completed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data: (data || null) as BlockIntakeWizard | null, error };
}

export async function saveBlockIntakeStep(
  wizardId: string,
  step: number,
  answers: Record<string, string>,
  completed: boolean,
) {
  const { error } = await supabase
    .from("block_intake_wizard")
    .update({
      step,
      answers,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wizardId);

  return { error };
}

export async function markBlockIntakeReviewed(wizardId: string) {
  const { error } = await supabase
    .from("block_intake_wizard")
    .update({
      coach_reviewed_at: new Date().toISOString(),
    })
    .eq("id", wizardId);

  return { error };
}
