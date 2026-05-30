"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import type {
  CoachPerformanceRow,
  GrowthMonth,
  InvulscoreOverview,
  PlatformStats,
} from "@/lib/adminAnalytics";

type AnalyticsPayload = {
  platform: PlatformStats;
  invulscore: InvulscoreOverview;
  coachPerformance: CoachPerformanceRow[];
  growth: GrowthMonth[];
  activeUsers30d: number;
};

export default function AdminAnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    void adminFetch<AnalyticsPayload>("/api/admin/analytics").then((result) => {
      if (result.data) setData(result.data);
      else if (result.error) alert(result.error);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return <p className="text-sm text-gray-500">Analytics laden...</p>;
  }

  const maxGrowth = Math.max(...data.growth.map((g) => g.signups), 1);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Platformstatistieken</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Gebruikers" value={data.platform.totalUsers} />
          <Stat label="Chat (30d)" value={data.platform.chatMessages30d} />
          <Stat label="Chatgroepen" value={data.platform.chatGroups} />
          <Stat
            label="Gem. invulscore"
            value={
              data.platform.avgInvulscore !== null
                ? `${data.platform.avgInvulscore}%`
                : "—"
            }
          />
          <Stat label="Actief (30d)" value={data.activeUsers30d} />
          <Stat
            label="Atleten met programma"
            value={data.platform.athletesWithPrograms}
          />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Invulscore-overzicht</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Gemiddelde" value={`${data.invulscore.average}%`} />
          <Stat label="Mediaan" value={`${data.invulscore.median}%`} />
          <Stat label="Onder 50%" value={data.invulscore.below50} />
          <Stat label="Gescoord" value={data.invulscore.athletesScored} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Coach-prestaties</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="py-2">Coach</th>
                <th className="py-2">Atleten</th>
                <th className="py-2">Invulscore</th>
                <th className="py-2">Organisatie</th>
              </tr>
            </thead>
            <tbody>
              {data.coachPerformance
                .sort((a, b) => b.athleteCount - a.athleteCount)
                .map((row) => (
                  <tr key={row.coachId} className="border-t border-gray-100">
                    <td className="py-2 font-medium">{row.coachName}</td>
                    <td className="py-2">{row.athleteCount}</td>
                    <td className="py-2">{row.avgInvulscore}%</td>
                    <td className="py-2">{row.organizationName || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Groei (aanmeldingen)</h2>
        <div className="mt-4 space-y-2">
          {data.growth.map((month) => (
            <div key={month.month} className="flex items-center gap-3 text-sm">
              <span className="w-20 text-gray-500">{month.month}</span>
              <div className="h-3 flex-1 rounded-full bg-gray-100">
                <div
                  className="h-3 rounded-full bg-black"
                  style={{
                    width: `${Math.round((month.signups / maxGrowth) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-8 text-right font-semibold">{month.signups}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs font-bold uppercase text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-black">{value}</p>
    </div>
  );
}
