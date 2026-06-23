"use client";

import { useEffect, useState } from "react";
import { loadDeloadSuggestion, type DeloadSuggestion } from "@/lib/deloadSuggestion";

export default function DeloadSuggestionBanner({
  athleteId,
}: {
  athleteId: string;
}) {
  const [suggestion, setSuggestion] = useState<DeloadSuggestion | null>(null);

  useEffect(() => {
    if (!athleteId) return;
    void loadDeloadSuggestion(athleteId).then(setSuggestion);
  }, [athleteId]);

  if (!suggestion?.show) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">Deload-suggestie</p>
      <p className="mt-1">{suggestion.message}</p>
    </div>
  );
}
