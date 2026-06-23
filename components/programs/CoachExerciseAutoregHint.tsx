"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getAutoregulationSuggestion } from "@/lib/autoregulation";

type CoachExerciseAutoregHintProps = {
  athleteId: string;
  exerciseId: string;
  targetRpe: string | null;
};

export default function CoachExerciseAutoregHint({
  athleteId,
  exerciseId,
  targetRpe,
}: CoachExerciseAutoregHintProps) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("athlete_exercise_sets")
        .select("rpe")
        .eq("athlete_id", athleteId)
        .eq("program_exercise_id", exerciseId);

      const suggestion = getAutoregulationSuggestion({
        targetRpe,
        loggedRpes: (data || []).map((row) => String(row.rpe || "")),
      });

      setLabel(suggestion?.kind === "none" ? null : suggestion?.label || null);
    }

    void load();
  }, [athleteId, exerciseId, targetRpe]);

  if (!label) return null;

  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
      {label}
    </span>
  );
}
