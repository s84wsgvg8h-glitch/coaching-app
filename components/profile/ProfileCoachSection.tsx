"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProfileCoachSectionProps = {
  athleteId: string;
  canRemoveCoach?: boolean;
};

export default function ProfileCoachSection({
  athleteId,
  canRemoveCoach = false,
}: ProfileCoachSectionProps) {
  const [coachName, setCoachName] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: athleteProfile } = await supabase
        .from("profiles")
        .select("coach_id")
        .eq("id", athleteId)
        .single();

      if (cancelled) return;

      const nextCoachId = athleteProfile?.coach_id || null;
      setCoachId(nextCoachId);

      if (!nextCoachId) {
        setCoachName(null);
        setLoading(false);
        return;
      }

      const { data: coachProfile } = await supabase
        .from("profiles")
        .select("full_name, business_name")
        .eq("id", nextCoachId)
        .single();

      if (cancelled) return;

      setCoachName(
        coachProfile?.business_name ||
          coachProfile?.full_name ||
          "Onbekende coach",
      );
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  async function removeCoach() {
    if (!coachId) return;

    const confirmed = window.confirm(
      "Weet je zeker dat je je coach wilt verwijderen? Je coach verliest toegang tot je gegevens.",
    );

    if (!confirmed) return;

    setRemoving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({ coach_id: null })
      .eq("id", athleteId);

    setRemoving(false);

    if (error) {
      setMessage("Coach verwijderen mislukt.");
      return;
    }

    setCoachId(null);
    setCoachName(null);
    setMessage("Coach verwijderd.");
  }

  if (loading) {
    return <p className="text-sm text-app-muted">Coach laden...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-app-text">Coach beheren</h2>
        <p className="mt-1 text-sm text-app-muted">
          Je gekoppelde coach voor online coaching.
        </p>
      </div>

      {coachId && coachName ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Huidige coach
          </p>
          <p className="mt-2 text-2xl font-bold text-app-text">{coachName}</p>

          {canRemoveCoach ? (
            <button
              type="button"
              onClick={() => void removeCoach()}
              disabled={removing}
              className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {removing ? "Verwijderen..." : "Coach verwijderen"}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-app-muted">
          Je hebt momenteel geen coach gekoppeld.
        </div>
      )}

      {message ? <p className="text-sm text-app-muted">{message}</p> : null}

      {!coachId ? (
        <p className="text-sm text-app-muted">
          Vraag je coach om een uitnodigingslink om je account te koppelen.
        </p>
      ) : null}
    </div>
  );
}
