import { NextRequest, NextResponse } from "next/server";
import { assertCoachLike, getSupabaseForRequest } from "@/lib/coachApiAuth";
import {
  findSiblingExerciseIds,
  type DaySlot,
  type ExerciseSlot,
} from "@/lib/programWeek/applyExerciseAcrossBlock";

type Body = {
  blockId?: string;
  exerciseId?: string;
  patch?: Record<string, string | number | null>;
};

export async function POST(request: NextRequest) {
  const auth = await assertCoachLike(request);
  if (auth.error || !auth.db || !auth.userId) {
    return NextResponse.json(
      { error: auth.error ?? "Geen toegang." },
      { status: auth.error === "Niet ingelogd." ? 401 : 403 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ongeldige body." }, { status: 400 });
  }

  const blockId = typeof body.blockId === "string" ? body.blockId.trim() : "";
  const exerciseId =
    typeof body.exerciseId === "string" ? body.exerciseId.trim() : "";
  const patchEntries = Object.entries(body.patch || {}).filter(
    ([, value]) => value !== undefined,
  );
  const patch = Object.fromEntries(patchEntries) as Record<
    string,
    string | number | null
  >;

  if (!blockId || !exerciseId || patchEntries.length === 0) {
    return NextResponse.json({ error: "Ontbrekende gegevens." }, { status: 400 });
  }

  const userClient = getSupabaseForRequest(request);
  const { data: canWrite, error: accessError } = await userClient.rpc(
    "can_write_program_block",
    { p_block_id: blockId },
  );

  if (accessError) {
    return NextResponse.json({ error: accessError.message }, { status: 500 });
  }

  if (!canWrite) {
    return NextResponse.json(
      { error: "Geen schrijfrechten voor dit block." },
      { status: 403 },
    );
  }

  const admin = auth.db;

  const { data: exercise, error: exerciseError } = await admin
    .from("program_exercises")
    .select("id, name, program_day_id, exercise_number")
    .eq("id", exerciseId)
    .maybeSingle();

  if (exerciseError) {
    return NextResponse.json({ error: exerciseError.message }, { status: 500 });
  }

  if (!exercise?.program_day_id) {
    return NextResponse.json({ updated: 0 });
  }

  const { data: sourceDay, error: sourceDayError } = await admin
    .from("program_days")
    .select("id, program_week_id")
    .eq("id", exercise.program_day_id)
    .maybeSingle();

  if (sourceDayError) {
    return NextResponse.json({ error: sourceDayError.message }, { status: 500 });
  }

  if (!sourceDay?.program_week_id) {
    return NextResponse.json({ updated: 0 });
  }

  const { data: sourceWeek, error: sourceWeekError } = await admin
    .from("program_weeks")
    .select("id, program_block_id")
    .eq("id", sourceDay.program_week_id)
    .maybeSingle();

  if (sourceWeekError) {
    return NextResponse.json({ error: sourceWeekError.message }, { status: 500 });
  }

  if (!sourceWeek || sourceWeek.program_block_id !== blockId) {
    return NextResponse.json(
      { error: "Oefening hoort niet bij dit block." },
      { status: 400 },
    );
  }

  const { data: weeks, error: weeksError } = await admin
    .from("program_weeks")
    .select("id")
    .eq("program_block_id", blockId);

  if (weeksError) {
    return NextResponse.json({ error: weeksError.message }, { status: 500 });
  }

  const weekIds = (weeks || []).map((week) => week.id);
  if (weekIds.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const { data: days, error: daysError } = await admin
    .from("program_days")
    .select("id, title, day_number, program_week_id")
    .in("program_week_id", weekIds);

  if (daysError) {
    return NextResponse.json({ error: daysError.message }, { status: 500 });
  }

  const dayRows = (days || []) as DaySlot[];
  const dayIds = dayRows.map((day) => day.id);
  if (dayIds.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const { data: exercises, error: exercisesError } = await admin
    .from("program_exercises")
    .select("id, name, program_day_id, exercise_number")
    .in("program_day_id", dayIds);

  if (exercisesError) {
    return NextResponse.json({ error: exercisesError.message }, { status: 500 });
  }

  const ids = findSiblingExerciseIds({
    sourceExerciseId: exercise.id,
    sourceDayId: exercise.program_day_id,
    days: dayRows,
    exercises: (exercises || []) as ExerciseSlot[],
  });

  if (ids.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const { error: updateError } = await admin
    .from("program_exercises")
    .update(patch)
    .in("id", ids);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ updated: ids.length });
}
