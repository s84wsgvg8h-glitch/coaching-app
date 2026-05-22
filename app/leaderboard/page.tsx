"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";

type Athlete = {
  id: string;
  full_name: string | null;
};

type LeaderboardRow = {
  athlete_id: string;
  full_name: string;
  openipf_found: boolean;
  gl_points: number;
  total_kg: string;
  bodyweight_kg: string;
  meet_name: string;
  date: string;
  openipf_name: string;
};

async function getBestOpenIpfResult(fullName: string) {
  const response = await fetch(
    `/api/openipf-lifter?name=${encodeURIComponent(fullName)}`
  );

  if (!response.ok) return null;

  const data = await response.json();

  return data.result;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setLoading(true);

    const { data: athletes, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "atleet")
      .order("full_name", { ascending: true });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const leaderboard = await Promise.all(
      (athletes || []).map(async (athlete: Athlete) => {
        const fullName = athlete.full_name || "Naamloze atleet";
        const bestResult = await getBestOpenIpfResult(fullName);

        return {
          athlete_id: athlete.id,
          full_name: fullName,
          openipf_found: !!bestResult,
          gl_points: bestResult?.goodlift || 0,
          total_kg: bestResult?.totalKg || "",
          bodyweight_kg: bestResult?.bodyweightKg || "",
          meet_name: bestResult?.meetName || "",
          date: bestResult?.date || "",
          openipf_name: bestResult?.name || "",
        };
      })
    );

    leaderboard.sort((a, b) => b.gl_points - a.gl_points);

    setRows(leaderboard);
    setLoading(false);
  }

  return (
    <AppShell contentClassName="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-gray-500 mb-1">Leaderboard</p>
            <h1 className="text-3xl font-bold">OpenIPF GL Points ranking</h1>
            <p className="text-gray-500 mt-2">
              Atleten gerankt op hun beste OpenIPF GL Points.
            </p>
          </div>

          <a href="/dashboard" className="bg-black text-white px-4 py-2 rounded-xl">
            Terug
          </a>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow p-8">
            <p className="text-gray-500">OpenIPF data laden...</p>
          </div>
        )}

        {!loading && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            {rows.map((row, index) => (
              <div
                key={row.athlete_id}
                className="flex items-center justify-between gap-6 p-5 border-b last:border-b-0"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                      index === 0
                        ? "bg-yellow-300 text-black"
                        : index === 1
                          ? "bg-gray-300 text-black"
                          : index === 2
                            ? "bg-orange-300 text-black"
                            : "bg-black text-white"
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <h2 className="font-bold text-lg truncate">{row.full_name}</h2>

                    {row.openipf_found ? (
                      <p className="text-sm text-gray-500 truncate">
                        OpenIPF: {row.openipf_name} · {row.meet_name || "wedstrijd onbekend"}
                      </p>
                    ) : (
                      <p className="text-sm text-red-500">
                        Niet gevonden in OpenIPF
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-8 text-right">
                  <div>
                    <p className="text-xs text-gray-400 font-bold">GL POINTS</p>
                    <p className="font-bold text-xl">
                      {row.gl_points > 0 ? row.gl_points.toFixed(2) : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-bold">TOTAAL</p>
                    <p className="font-bold">{row.total_kg || "-"} kg</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-bold">BW</p>
                    <p className="font-bold">{row.bodyweight_kg || "-"} kg</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-bold">DATUM</p>
                    <p className="font-bold">{row.date || "-"}</p>
                  </div>
                </div>
              </div>
            ))}

            {rows.length === 0 && (
              <div className="p-8">
                <p className="text-gray-500">Geen atleten gevonden.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
