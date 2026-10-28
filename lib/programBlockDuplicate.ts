import { createProgramBlockForAthlete } from "@/lib/programBlockCreate";
import { createProgramWeekForBlock } from "@/lib/programWeekCreate";
import { duplicateProgramWeekId } from "@/lib/programWeekDuplicate";
import { supabase } from "@/lib/supabaseClient";

export type DuplicateProgramBlockInput = {
  sourceBlockId: string;
  athleteId: string;
  title: string;
  description?: string;
  startDate: string;
  macrocycleId?: string | null;
  sourceWeeks: Array<{
    id: string;
    week_number: number;
    title: string;
  }>;
};

type DuplicateProgramBlockResult = {
  blockId: string | null;
  firstWeekId: string | null;
  error: string | null;
};

function parseDuplicateRpcResult(data: unknown): DuplicateProgramBlockResult {
  if (!data || typeof data !== "object") {
    return {
      blockId: null,
      firstWeekId: null,
      error: "Block kon niet worden gekopieerd.",
    };
  }

  const payload = data as { block_id?: unknown; first_week_id?: unknown };
  const blockId = typeof payload.block_id === "string" ? payload.block_id : null;
  const firstWeekId =
    typeof payload.first_week_id === "string" ? payload.first_week_id : null;

  if (!blockId || !firstWeekId) {
    return {
      blockId: null,
      firstWeekId: null,
      error: "Block kon niet worden gekopieerd.",
    };
  }

  return { blockId, firstWeekId, error: null };
}

async function duplicateProgramBlockViaRpc(
  input: DuplicateProgramBlockInput,
): Promise<DuplicateProgramBlockResult> {
  const { data, error } = await supabase.rpc("duplicate_program_block", {
    p_source_block_id: input.sourceBlockId,
    p_title: input.title.trim(),
  });

  if (error) {
    const missingRpc =
      error.code === "PGRST202" ||
      error.message.toLowerCase().includes("duplicate_program_block");

    if (missingRpc) {
      return duplicateProgramBlockViaClient(input);
    }

    return { blockId: null, firstWeekId: null, error: error.message };
  }

  return parseDuplicateRpcResult(data);
}

async function duplicateProgramBlockViaClient(
  input: DuplicateProgramBlockInput,
): Promise<DuplicateProgramBlockResult> {
  const { blockId, error: createError } = await createProgramBlockForAthlete({
    athleteId: input.athleteId,
    title: input.title.trim(),
    description: input.description?.trim() || "",
    startDate: input.startDate,
    macrocycleId: input.macrocycleId ?? null,
  });

  if (createError || !blockId) {
    return {
      blockId: null,
      firstWeekId: null,
      error: createError || "Block kon niet worden gekopieerd.",
    };
  }

  const { data: placeholderWeeks, error: placeholderError } = await supabase
    .from("program_weeks")
    .select("id")
    .eq("program_block_id", blockId)
    .eq("week_number", 1);

  if (placeholderError) {
    return { blockId, firstWeekId: null, error: placeholderError.message };
  }

  const placeholderWeekId = placeholderWeeks?.[0]?.id;
  if (placeholderWeekId) {
    const { error: deletePlaceholderError } = await supabase
      .from("program_weeks")
      .delete()
      .eq("id", placeholderWeekId);

    if (deletePlaceholderError) {
      return { blockId, firstWeekId: null, error: deletePlaceholderError.message };
    }
  }

  const sourceWeeks = [...input.sourceWeeks].sort((a, b) => a.week_number - b.week_number);

  const copiedWeekIds = await Promise.all(
    sourceWeeks.map(async (sourceWeek) => {
      const { weekId, error: weekError } = await duplicateProgramWeekId({
        sourceWeekId: sourceWeek.id,
        targetBlockId: blockId,
        targetWeekNumber: sourceWeek.week_number,
        targetTitle: sourceWeek.title,
      });

      if (weekError || !weekId) {
        throw new Error(weekError || "Week kon niet worden gekopieerd.");
      }

      return weekId;
    }),
  );

  let firstWeekId = copiedWeekIds[0] ?? null;

  if (!firstWeekId) {
    const { week: createdWeek, error: weekError } = await createProgramWeekForBlock({
      blockId,
      title: "Week 1",
      weekNumber: 1,
    });

    if (weekError || !createdWeek) {
      return {
        blockId,
        firstWeekId: null,
        error: weekError || "Week kon niet worden aangemaakt.",
      };
    }

    firstWeekId = createdWeek.id;
  }

  return { blockId, firstWeekId, error: null };
}

export async function duplicateProgramBlock(
  input: DuplicateProgramBlockInput,
): Promise<DuplicateProgramBlockResult> {
  try {
    return await duplicateProgramBlockViaRpc(input);
  } catch (error) {
    return {
      blockId: null,
      firstWeekId: null,
      error: error instanceof Error ? error.message : "Block kon niet worden gekopieerd.",
    };
  }
}
