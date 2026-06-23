import { supabase } from "@/lib/supabaseClient";
import { createProgramBlockForAthlete } from "@/lib/programBlockCreate";
import { loadProgramHierarchy, type ProgramHierarchy } from "@/lib/programData";

export type ProgramTemplateOptions = {
  includeNotes: boolean;
  includeUitlegVideos: boolean;
};

export type ProgramTemplateStructure = {
  scope: "block" | "week";
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

const DEFAULT_TEMPLATE_OPTIONS: ProgramTemplateOptions = {
  includeNotes: true,
  includeUitlegVideos: true,
};

function applyTemplateContentOptions<
  T extends ProgramTemplateStructure,
>(structure: T, options: ProgramTemplateOptions): T {
  if (options.includeNotes && options.includeUitlegVideos) return structure;

  return {
    ...structure,
    weeks: structure.weeks.map((week) => ({
      ...week,
      days: week.days.map((day) => ({
        ...day,
        notes: options.includeNotes ? day.notes : null,
        warmup: options.includeNotes ? day.warmup : null,
        exercises: day.exercises.map((exercise) => ({
          ...exercise,
          notes: options.includeNotes ? exercise.notes : null,
          exercise_library_id: options.includeUitlegVideos
            ? exercise.exercise_library_id
            : null,
        })),
      })),
    })),
  };
}

function buildStructureFromBlock(
  blockId: string,
  hierarchy: ProgramHierarchy,
  options: ProgramTemplateOptions,
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

  return applyTemplateContentOptions(
    {
      scope: "block",
      block: { title: block.title, description: block.description ?? null },
      weeks,
    },
    options,
  );
}

function buildStructureFromWeek(
  weekId: string,
  hierarchy: ProgramHierarchy,
  options: ProgramTemplateOptions,
): ProgramTemplateStructure | null {
  const week = hierarchy.weekById[weekId];
  if (!week) return null;

  const block = hierarchy.blockById[week.program_block_id];
  if (!block) return null;

  const structure = buildStructureFromBlock(block.id, hierarchy, options);
  if (!structure) return null;

  const targetWeek = structure.weeks.find(
    (item) => item.week_number === week.week_number,
  );

  if (!targetWeek) return null;

  return applyTemplateContentOptions(
    {
      scope: "week",
      block: { title: block.title, description: block.description ?? null },
      weeks: [targetWeek],
    },
    options,
  );
}

async function insertTemplateWeeks(
  blockId: string,
  weeks: ProgramTemplateStructure["weeks"],
  weekNumberOffset = 0,
) {
  for (const week of weeks) {
    const { data: createdWeek, error: weekError } = await supabase
      .from("program_weeks")
      .insert({
        title: week.title,
        week_number: week.week_number + weekNumberOffset,
        program_block_id: blockId,
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
  options: ProgramTemplateOptions = DEFAULT_TEMPLATE_OPTIONS,
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

  const structure = buildStructureFromBlock(blockId, hierarchy, options);
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

export async function saveWeekAsTemplate(
  coachId: string,
  weekId: string,
  name: string,
  actingUserId: string,
  actingRole: string,
  options: ProgramTemplateOptions = DEFAULT_TEMPLATE_OPTIONS,
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

  const week = hierarchy.weekById[weekId];
  const structure = buildStructureFromWeek(weekId, hierarchy, options);
  if (!structure || !week) {
    return { data: null, error: new Error("Week niet gevonden") };
  }

  return supabase
    .from("program_templates")
    .insert({
      coach_id: coachId,
      name: name.trim(),
      source_program_id: week.program_block_id,
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
  targetBlockId?: string,
) {
  const { data: template, error: templateError } = await supabase
    .from("program_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return {
      blockId: null,
      weekId: null,
      error: templateError?.message || "Sjabloon niet gevonden",
    };
  }

  const structure = template.structure as ProgramTemplateStructure;
  const scope = structure.scope || "block";

  if (scope === "week" && targetBlockId) {
    const { data: existingWeeks } = await supabase
      .from("program_weeks")
      .select("week_number")
      .eq("program_block_id", targetBlockId)
      .order("week_number", { ascending: false })
      .limit(1);

    const nextWeekNumber = (existingWeeks?.[0]?.week_number ?? 0) + 1;
    const normalizedWeeks = structure.weeks.map((week, index) => ({
      ...week,
      week_number: nextWeekNumber + index,
    }));

    await insertTemplateWeeks(targetBlockId, normalizedWeeks);

    const { data: createdWeeks } = await supabase
      .from("program_weeks")
      .select("id")
      .eq("program_block_id", targetBlockId)
      .order("week_number", { ascending: false })
      .limit(1);

    return {
      blockId: targetBlockId,
      weekId: createdWeeks?.[0]?.id ?? null,
      error: null,
    };
  }

  const { blockId, error: blockError } = await createProgramBlockForAthlete({
    athleteId,
    title: structure.block.title,
    description: structure.block.description || "",
    startDate: startDate || new Date().toISOString().slice(0, 10),
  });

  if (blockError || !blockId) {
    return {
      blockId: null,
      weekId: null,
      error: blockError || "Block aanmaken mislukt",
    };
  }

  await supabase.from("program_weeks").delete().eq("program_block_id", blockId);
  await insertTemplateWeeks(blockId, structure.weeks);

  const { data: firstWeek } = await supabase
    .from("program_weeks")
    .select("id")
    .eq("program_block_id", blockId)
    .order("week_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    blockId,
    weekId: (firstWeek?.id as string) ?? null,
    error: null,
  };
}
