"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { SkeletonList } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  filterCoachAthleteOverview,
  loadCoachAthleteOverview,
  type CoachAthleteOverviewRow,
} from "@/lib/coachAthleteOverview";
import {
  formatFillScorePercentage,
  getFillScoreColorClass,
} from "@/lib/athleteFillScore";

export default function AthleteOverviewPage() {
  const [rows, setRows] = useState<CoachAthleteOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fillMin, setFillMin] = useState(0);
  const [fillMax, setFillMax] = useState(100);
  const [bodyweightMin, setBodyweightMin] = useState("");
  const [bodyweightMax, setBodyweightMax] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Atleten overzicht";

    async function init() {
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

      setRows(await loadCoachAthleteOverview(user.id, profile?.role || ""));
      setLoading(false);
    }

    void init();
  }, []);

  const filtered = useMemo(() => {
    const bwMin = bodyweightMin.trim() ? Number(bodyweightMin) : null;
    const bwMax = bodyweightMax.trim() ? Number(bodyweightMax) : null;

    return filterCoachAthleteOverview(rows, {
      fillMin,
      fillMax,
      bodyweightMin: Number.isFinite(bwMin) ? bwMin : null,
      bodyweightMax: Number.isFinite(bwMax) ? bwMax : null,
    }).filter((row) =>
      row.fullName.toLowerCase().includes(search.trim().toLowerCase()),
    );
  }, [rows, fillMin, fillMax, bodyweightMin, bodyweightMax, search]);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-app-text">Atleten overzicht</h1>
        <p className="mt-1 text-sm text-app-muted">
          Alle atleten onder elkaar, filter op invulscore en lichaamsgewicht.
        </p>

        <div className="app-card mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zoek op naam..."
            className="rounded-xl border border-app-border px-3 py-2 text-sm sm:col-span-2 lg:col-span-3"
          />
          <label className="text-xs font-semibold text-app-muted">
            Invulscore min (%)
            <input
              type="number"
              min={0}
              max={100}
              value={fillMin}
              onChange={(event) => setFillMin(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-app-border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-app-muted">
            Invulscore max (%)
            <input
              type="number"
              min={0}
              max={100}
              value={fillMax}
              onChange={(event) => setFillMax(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-app-border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-app-muted">
            Bodyweight min (kg)
            <input
              type="number"
              value={bodyweightMin}
              onChange={(event) => setBodyweightMin(event.target.value)}
              placeholder="—"
              className="mt-1 w-full rounded-xl border border-app-border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-app-muted">
            Bodyweight max (kg)
            <input
              type="number"
              value={bodyweightMax}
              onChange={(event) => setBodyweightMax(event.target.value)}
              placeholder="—"
              className="mt-1 w-full rounded-xl border border-app-border px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="app-card mt-4 overflow-hidden p-0">
          {loading ? (
            <div className="p-4">
              <SkeletonList rows={8} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-app-muted">
              Geen atleten gevonden met deze filters.
            </p>
          ) : (
            <ul>
              {filtered.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 border-b border-app-border px-4 py-2 last:border-b-0"
                >
                  <Link
                    href={`/profile/${row.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-semibold text-app-text hover:text-brand-purple"
                  >
                    {row.fullName}
                  </Link>
                  <span
                    className={`shrink-0 text-sm font-bold tabular-nums ${getFillScoreColorClass(row.fillScore)}`}
                  >
                    {formatFillScorePercentage(row.fillScore)}
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-app-muted">
                    {row.bodyweightKg !== null ? `${row.bodyweightKg} kg` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
