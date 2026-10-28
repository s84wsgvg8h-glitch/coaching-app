import { supabase } from "@/lib/supabaseClient";

function isMissingRpcError(message: string, code?: string) {
  return (
    code === "PGRST202" ||
    message.toLowerCase().includes("delete_program_block")
  );
}

async function deleteProgramBlockLegacy(
  blockId: string,
): Promise<{ error: string | null }> {
  const { data: blockWeeks, error: weeksQueryError } = await supabase
    .from("program_weeks")
    .select("id")
    .eq("program_block_id", blockId);

  if (weeksQueryError) {
    return { error: weeksQueryError.message };
  }

  const weekIds = (blockWeeks || []).map((item) => item.id);

  if (weekIds.length > 0) {
    const { data: blockDays, error: daysQueryError } = await supabase
      .from("program_days")
      .select("id")
      .in("program_week_id", weekIds);

    if (daysQueryError) {
      return { error: daysQueryError.message };
    }

    const dayIds = (blockDays || []).map((day) => day.id);

    if (dayIds.length > 0) {
      const { error: exerciseError } = await supabase
        .from("program_exercises")
        .delete()
        .in("program_day_id", dayIds);

      if (exerciseError) {
        return { error: exerciseError.message };
      }

      const { error: daysError } = await supabase
        .from("program_days")
        .delete()
        .in("id", dayIds);

      if (daysError) {
        return { error: daysError.message };
      }
    }

    const { error: weeksError } = await supabase
      .from("program_weeks")
      .delete()
      .in("id", weekIds);

    if (weeksError) {
      return { error: weeksError.message };
    }
  }

  const { error } = await supabase.from("program_blocks").delete().eq("id", blockId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function deleteProgramBlock(
  blockId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("delete_program_block", {
    p_block_id: blockId,
  });

  if (!error) {
    return { error: null };
  }

  if (isMissingRpcError(error.message, error.code)) {
    return deleteProgramBlockLegacy(blockId);
  }

  return { error: error.message };
}
