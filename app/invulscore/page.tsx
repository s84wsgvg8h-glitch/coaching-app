"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import {
  calculateAthleteFillScore,
  formatFillScorePercentage,
  getFillScoreColorClass,
  type AthleteFillScore,
  type FillScoreBlock,
  type FillScoreCheckin,
  type FillScoreDay,
  type FillScoreExercise,
  type FillScoreSetRow,
  type FillScoreWeek,
} from "@/lib/athleteFillScore";
import { isAdminRole, isCoachLikeRole } from "@/lib/authRoles";

export default function InvulscorePage() {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<AthleteFillScore[]>([]);

  useEffect(() => {
    document.title = "Programma invulscore";

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!isCoachLikeRole(profile?.role)) {
        window.location.href = "/dashboard";
        return;
      }

      let athletesQuery = supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "atleet")
        .order("full_name", { ascending: true });

      if (!isAdminRole(profile?.role)) {
        athletesQuery = athletesQuery.eq("coach_id", user.id);
      }

      const { data: athletes, error: athletesError } = await athletesQuery;

      if (athletesError) {
        alert(athletesError.message);
        setLoading(false);
        return;
      }

      const athleteIds = (athletes || []).map((athlete) => athlete.id);

      if (athleteIds.length === 0) {
        setScores([]);
        setLoading(false);
        return;
      }

      const { data: blocks, error: blocksError } = await supabase
        .from("program_blocks")
        .select("id, athlete_id, start_date")
        .in("athlete_id", athleteIds);

      if (blocksError) {
        alert(blocksError.message);
        setLoading(false);
        return;
      }

      const blockRows = (blocks || []) as FillScoreBlock[];
      const blockIds = blockRows.map((block) => block.id);

      if (blockIds.length === 0) {
        setScores(
          (athletes || []).map((athlete) => ({
            athleteId: athlete.id,
            athleteName: athlete.full_name || "Naamloos",
            filled: 0,
            total: 0,
            percentage: 100,
          })),
        );
        setLoading(false);
        return;
      }

      const { data: weeks, error: weeksError } = await supabase
        .from("program_weeks")
        .select("id, week_number, program_block_id")
        .in("program_block_id", blockIds);

      if (weeksError) {
        alert(weeksError.message);
        setLoading(false);
        return;
      }

      const weekRows = (weeks || []) as FillScoreWeek[];
      const weekIds = weekRows.map((week) => week.id);

      const { data: days, error: daysError } = await supabase
        .from("program_days")
        .select("id, program_week_id, day_number")
        .in("program_week_id", weekIds);

      if (daysError) {
        alert(daysError.message);
        setLoading(false);
        return;
      }

      const dayRows = (days || []) as FillScoreDay[];
      const dayIds = dayRows.map((day) => day.id);

      const { data: exercises, error: exercisesError } = await supabase
        .from("program_exercises")
        .select("id, program_day_id, name, sets, reps, rpe, load")
        .in("program_day_id", dayIds);

      if (exercisesError) {
        alert(exercisesError.message);
        setLoading(false);
        return;
      }

      const exerciseRows = (exercises || []) as FillScoreExercise[];
      const exerciseIds = exerciseRows.map((exercise) => exercise.id);

      const [{ data: setRows, error: setsError }, { data: checkins, error: checkinsError }] =
        await Promise.all([
          exerciseIds.length > 0
            ? supabase
                .from("athlete_exercise_sets")
                .select(
                  "program_exercise_id, athlete_id, set_number, reps, weight, rpe",
                )
                .in("athlete_id", athleteIds)
                .in("program_exercise_id", exerciseIds)
            : Promise.resolve({ data: [], error: null }),
          dayIds.length > 0
            ? supabase
                .from("athlete_day_checkins")
                .select(
                  "program_day_id, athlete_id, bw, recovery, fatigue, notes",
                )
                .in("athlete_id", athleteIds)
                .in("program_day_id", dayIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (setsError || checkinsError) {
        alert(setsError?.message || checkinsError?.message || "Laden mislukt");
        setLoading(false);
        return;
      }

      const athleteBlocks = blockRows.filter((block) =>
        athleteIds.includes(block.athlete_id || ""),
      );

      const nextScores = (athletes || []).map((athlete) =>
        calculateAthleteFillScore({
          athleteId: athlete.id,
          athleteName: athlete.full_name || "Naamloos",
          blocks: athleteBlocks.filter((block) => block.athlete_id === athlete.id),
          weeks: weekRows,
          days: dayRows,
          exercises: exerciseRows,
          setRows: (setRows || []) as FillScoreSetRow[],
          checkins: (checkins || []) as FillScoreCheckin[],
        }),
      );

      nextScores.sort((a, b) => a.percentage - b.percentage);
      setScores(nextScores);
      setLoading(false);
    }

    void load();
  }, []);

  return (
    <AppShell contentClassName="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Coach overzicht
          </p>
          <h1 className="text-3xl font-bold text-black">Programma invulscore</h1>
          <p className="mt-2 text-gray-600">
            Percentage ingevulde velden per atleet voor verstreken trainingsdagen,
            inclusief pre-training check-in (herstel en fatigue, zonder BW).
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-6 shadow-xl">Laden...</div>
        ) : scores.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 text-gray-500 shadow-xl">
            Geen atleten gevonden.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] gap-3 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
              <span>Atleet</span>
              <span className="text-right">Score</span>
              <span className="text-right">Velden</span>
            </div>

            <div className="divide-y divide-gray-100">
              {scores.map((score) => (
                <Link
                  key={score.athleteId}
                  href={`/profile/${score.athleteId}`}
                  className="grid grid-cols-[minmax(0,1fr)_120px_120px] gap-3 px-5 py-4 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-semibold text-black">{score.athleteName}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${
                          score.percentage >= 90
                            ? "bg-emerald-500"
                            : score.percentage >= 70
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${score.percentage}%` }}
                      />
                    </div>
                  </div>

                  <p
                    className={`text-right text-2xl font-bold ${getFillScoreColorClass(score.percentage)}`}
                  >
                    {formatFillScorePercentage(score.percentage)}
                  </p>

                  <p className="text-right text-sm text-gray-500">
                    {score.filled}/{score.total}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
