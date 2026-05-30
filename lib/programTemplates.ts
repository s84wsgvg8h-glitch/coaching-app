import { supabase } from "@/lib/supabaseClient";
import { loadProgramHierarchy, type ProgramHierarchy } from "@/lib/programData";

export type ProgramTemplateStructure = {
  block: {
    title: string;
    description?: string | null;
  };
  weeks: Array<{
    title: string;
    week_number: number;
    days: Array<{
      title: string;
      day_number: number;
      notes?: string | null;
      warmup?: string | null;
      exercises: Array<{
        name: string;
        sets: string | null;
        reps: string | null;
        load: string | null;
        rpe: string | null;
        notes?: string | null;
        exercise_number: number | null;
        priority?: string | null;
        exercise_library_id?: string | null;
      }>;
    }>;
  }>;
};

export type ProgramTemplate = {
  id: string;
  coach_id: string;
  name: string;
  source_program_id: string | null;
  structure: ProgramTemplateStructure;
  created_at: string;
};

function buildStructureFromHierarchy(
  blockId: string,
  hierarchy: ProgramHierarchy,
): ProgramTemplateStructure | null {
  const block = hierarchy.blockById[blockId];
  if (!block) return null;

  const weeks = hierarchy.weeks
    .filter((week) => week.program_block_id === blockId)
    .sort((a, b) => a.week_number - b.week_number)
    .map((week) => ({
      title: week.title,
      week_number: week.week_number,
      days: hierarchy.days
        .filter((day) => day.program_week_id === week.id)
        .sort((a, b) => a.day_number - b.day_number)
        .map((day) => ({
          title: day.title,
          day_number: day.day_number,
          notes: day.notes ?? null,
          warmup: day.warmup ?? null,
          exercises: hierarchy.exercises
            .filter((exercise) => exercise.program_day_id === day.id)
            .sort(
              (a, b) =>
                (a.exercise_number ?? 0) - (b.exercise_number ?? 0),
            )
            .map((exercise) => ({
              name: exercise.name,
              sets: exercise.sets,
              reps: exercise.reps,
              load: exercise.load,
              rpe: exercise.rpe,
              notes: exercise.notes ?? null,
              exercise_number: exercise.exercise_number,
              priority: exercise.priority ?? null,
              exercise_library_id: exercise.exercise_library_id ?? null,
            })),
        })),
    }));

  return {
    block: { title: block.title, description: block.description ?? null },
    weeks,
  };
}

export async function loadProgramTemplates(coachId: string) {
  const { data, error } = await supabase
    .from("program_templates")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Sjablonen laden mislukt:", error.message);
    return [] as ProgramTemplate[];
  }

  return (data || []) as ProgramTemplate[];
}

export async function saveProgramAsTemplate(
  coachId: string,
  blockId: string,
  name: string,
  actingUserId: string,
  actingRole: string,
) {
  const { data: hierarchy, error: hierarchyError } = await loadProgramHierarchy({
    userId: actingUserId,
    role: actingRole,
    includeSets: false,
    includeCheckins: false,
  });

  if (hierarchyError || !hierarchy) {
    return { data: null, error: new Error(hierarchyError || "Programma niet gevonden") };
  }

  const structure = buildStructureFromHierarchy(blockId, hierarchy);
  if (!structure) {
    return { data: null, error: new Error("Programma niet gevonden") };
  }

  return supabase
    .from("program_templates")
    .insert({
      coach_id: coachId,
      name: name.trim(),
      source_program_id: blockId,
      structure,
    })
    .select("*")
    .single();
}

export async function applyProgramTemplate(
  templateId: string,
  athleteId: string,
  actingUserId: string,
  startDate?: string,
) {
  const { data: template, error: templateError } = await supabase
    .from("program_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return { blockId: null, error: templateError?.message || "Sjabloon niet gevonden" };
  }

  const structure = template.structure as ProgramTemplateStructure;

  const { data: block, error: blockError } = await supabase
    .from("program_blocks")
    .insert({
      title: structure.block.title,
      description: structure.block.description || "",
      athlete_id: athleteId,
      start_date: startDate || new Date().toISOString().slice(0, 10),
      created_by: actingUserId,
    })
    .select("id")
    .single();

  if (blockError || !block) {
    return { blockId: null, error: blockError?.message || "Block aanmaken mislukt" };
  }

  for (const week of structure.weeks) {
    const { data: createdWeek, error: weekError } = await supabase
      .from("program_weeks")
      .insert({
        title: week.title,
        week_number: week.week_number,
        program_block_id: block.id,
      })
      .select("id")
      .single();

    if (weekError || !createdWeek) continue;

    for (const day of week.days) {
      const { data: createdDay, error: dayError } = await supabase
        .from("program_days")
        .insert({
          title: day.title,
          day_number: day.day_number,
          program_week_id: createdWeek.id,
          notes: day.notes,
          warmup: day.warmup,
        })
        .select("id")
        .single();

      if (dayError || !createdDay) continue;

      if (day.exercises.length > 0) {
        await supabase.from("program_exercises").insert(
          day.exercises.map((exercise) => ({
            program_day_id: createdDay.id,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            load: exercise.load,
            rpe: exercise.rpe,
            notes: exercise.notes,
            exercise_number: exercise.exercise_number,
            priority: exercise.priority,
            exercise_library_id: exercise.exercise_library_id,
          })),
        );
      }
    }
  }

  return { blockId: block.id as string, error: null };
}
