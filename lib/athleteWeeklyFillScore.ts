import {
  isDayInPastWeek,
  type AthleteFillScore,
} from "@/lib/athleteFillScore";
import { loadFillScoresForAthletes } from "@/lib/athleteFillScoreLoader";

export async function loadAthleteWeeklyFillScore(
  athleteId: string,
  athleteName = "Atleet",
): Promise<AthleteFillScore> {
  const empty: AthleteFillScore = {
    athleteId,
    athleteName,
    filled: 0,
    total: 0,
    percentage: 100,
  };

  const scores = await loadFillScoresForAthletes(
    [athleteId],
    [{ id: athleteId, full_name: athleteName }],
    ({ block, week, day }) =>
      isDayInPastWeek(block.start_date, week.week_number, day.day_number),
  );

  return scores[0] ?? empty;
}
