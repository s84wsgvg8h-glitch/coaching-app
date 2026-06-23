"use client";

import { useRouter } from "next/navigation";

type CoachAthleteSwitcherProps = {
  athletes: Array<{ id: string; full_name: string | null }>;
  currentAthleteId: string;
};

export default function CoachAthleteSwitcher({
  athletes,
  currentAthleteId,
}: CoachAthleteSwitcherProps) {
  const router = useRouter();

  if (athletes.length <= 1) return null;

  return (
    <label className="text-sm font-semibold text-app-text">
      <span className="sr-only">Wissel atleet</span>
      <select
        value={currentAthleteId}
        onChange={(event) => router.push(`/athletes/${event.target.value}`)}
        className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm font-semibold app-focus-ring"
      >
        {athletes.map((athlete) => (
          <option key={athlete.id} value={athlete.id}>
            {athlete.full_name || "Atleet"}
          </option>
        ))}
      </select>
    </label>
  );
}
