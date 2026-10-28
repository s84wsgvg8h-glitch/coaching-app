import { executeProgramEditOrQueue } from "@/lib/offlineProgramEditQueue";

type ProgramEditContext = {
  blockId: string;
  weekId: string;
};

function throwIfError(error: { message?: string } | null, queued: boolean) {
  if (queued || !error) return;
  throw error;
}

export async function offlineUpdateProgramDay(
  ctx: ProgramEditContext,
  dayId: string,
  patch: Record<string, unknown>,
) {
  const { error, queued } = await executeProgramEditOrQueue({
    ...ctx,
    op: { type: "table_update", table: "program_days", id: dayId, patch },
  });
  throwIfError(error, queued);
  return queued;
}

export async function offlineInsertProgramDay(
  ctx: ProgramEditContext,
  row: Record<string, unknown>,
) {
  const { error, queued } = await executeProgramEditOrQueue({
    ...ctx,
    op: { type: "table_insert", table: "program_days", row },
  });
  throwIfError(error, queued);
  return queued;
}

export async function offlineDeleteProgramDay(ctx: ProgramEditContext, dayId: string) {
  const { error, queued } = await executeProgramEditOrQueue({
    ...ctx,
    op: { type: "table_delete", table: "program_days", id: dayId },
  });
  throwIfError(error, queued);
  return queued;
}

export async function offlineUpdateProgramExercise(
  ctx: ProgramEditContext,
  exerciseId: string,
  patch: Record<string, unknown>,
) {
  const { error, queued } = await executeProgramEditOrQueue({
    ...ctx,
    op: {
      type: "table_update",
      table: "program_exercises",
      id: exerciseId,
      patch,
    },
  });
  throwIfError(error, queued);
  return queued;
}

export async function offlineDeleteProgramExercise(
  ctx: ProgramEditContext,
  exerciseId: string,
) {
  const { error, queued } = await executeProgramEditOrQueue({
    ...ctx,
    op: { type: "table_delete", table: "program_exercises", id: exerciseId },
  });
  throwIfError(error, queued);
  return queued;
}

export async function offlineBatchUpdateProgramExercises(
  ctx: ProgramEditContext,
  updates: Array<{ id: string; patch: Record<string, unknown> }>,
) {
  const { error, queued } = await executeProgramEditOrQueue({
    ...ctx,
    op: { type: "batch_update", table: "program_exercises", updates },
  });
  throwIfError(error, queued);
  return queued;
}

export async function offlineBatchUpdateProgramDays(
  ctx: ProgramEditContext,
  updates: Array<{ id: string; patch: Record<string, unknown> }>,
) {
  const { error, queued } = await executeProgramEditOrQueue({
    ...ctx,
    op: { type: "batch_update", table: "program_days", updates },
  });
  throwIfError(error, queued);
  return queued;
}

export async function offlineProgramRpc(
  ctx: ProgramEditContext,
  fn: string,
  args: Record<string, unknown>,
) {
  const { error, queued } = await executeProgramEditOrQueue({
    ...ctx,
    op: { type: "rpc", fn, args },
  });
  throwIfError(error, queued);
  return queued;
}
