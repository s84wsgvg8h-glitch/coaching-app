"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import {
  formatCompetitionDateRange,
  getTodayDateString,
  isUpcomingCompetition,
  type Competition,
} from "@/lib/competitions";

type EditForm = {
  naam: string;
  startDate: string;
  endDate: string;
};

function emptyEditForm(): EditForm {
  return { naam: "", startDate: "", endDate: "" };
}

export default function WedstrijdKalenderPage() {
  const [wedstrijden, setWedstrijden] = useState<Competition[]>([]);
  const [naam, setNaam] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [toevoegenLoading, setToevoegenLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm());
  const [opslaanLoading, setOpslaanLoading] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "done" | "error"
  >("idle");
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    void initPage();
  }, []);

  async function initPage() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const coachViewer =
        profile?.role === "coach" || profile?.role === "admin";
      setIsCoach(coachViewer);

      await haalWedstrijdenOp();

      if (coachViewer) {
        void syncKnkfCalendar(false);
      }

      return;
    }

    await haalWedstrijdenOp();
  }

  async function syncKnkfCalendar(force = false) {
    const cacheKey = "knkf-calendar-sync-date";
    const today = getTodayDateString();
    const lastSync =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(cacheKey)
        : null;

    if (!force && lastSync === today) {
      return;
    }

    setSyncStatus("syncing");
    setSyncMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/competition-calendar/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });

      const payload = (await response.json()) as {
        inserted?: number;
        skipped?: number;
        fetched?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Synchronisatie mislukt.");
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(cacheKey, today);
      }

      setSyncStatus("done");
      setSyncMessage(
        `${payload.inserted || 0} nieuw, ${payload.skipped || 0} bestonden al (${payload.fetched || 0} gevonden op KNKF).`,
      );
      await haalWedstrijdenOp();
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(
        error instanceof Error ? error.message : "Synchronisatie mislukt.",
      );
    }
  }

  async function haalWedstrijdenOp() {
    setLoading(true);

    const { data, error } = await supabase
      .from("wedstrijden")
      .select("id, naam, start_date, end_date, created_at")
      .order("start_date", { ascending: true });

    if (error) {
      alert(error.message);
      console.error(error);
      setLoading(false);
      return;
    }

    setWedstrijden((data || []) as Competition[]);
    setLoading(false);
  }

  async function voegWedstrijdToe() {
    if (!naam.trim() || !startDate) {
      alert("Vul een wedstrijdnaam en startdatum in.");
      return;
    }

    const resolvedEndDate = endDate || startDate;

    if (resolvedEndDate < startDate) {
      alert("De einddatum mag niet voor de startdatum liggen.");
      return;
    }

    setToevoegenLoading(true);

    const { error } = await supabase.from("wedstrijden").insert([
      {
        naam: naam.trim(),
        datum: startDate,
        start_date: startDate,
        end_date: resolvedEndDate,
      },
    ]);

    if (error) {
      alert(error.message);
      console.error(error);
      setToevoegenLoading(false);
      return;
    }

    setNaam("");
    setStartDate("");
    setEndDate("");
    setToevoegenLoading(false);

    await haalWedstrijdenOp();
  }

  function startBewerken(wedstrijd: Competition) {
    setEditingId(wedstrijd.id);
    setEditForm({
      naam: wedstrijd.naam,
      startDate: wedstrijd.start_date,
      endDate: wedstrijd.end_date,
    });
  }

  function annuleerBewerken() {
    setEditingId(null);
    setEditForm(emptyEditForm());
  }

  async function slaWedstrijdOp(id: string) {
    if (!editForm.naam.trim() || !editForm.startDate) {
      alert("Vul een wedstrijdnaam en startdatum in.");
      return;
    }

    const resolvedEndDate = editForm.endDate || editForm.startDate;

    if (resolvedEndDate < editForm.startDate) {
      alert("De einddatum mag niet voor de startdatum liggen.");
      return;
    }

    setOpslaanLoading(true);

    const { error } = await supabase
      .from("wedstrijden")
      .update({
        naam: editForm.naam.trim(),
        datum: editForm.startDate,
        start_date: editForm.startDate,
        end_date: resolvedEndDate,
      })
      .eq("id", id);

    setOpslaanLoading(false);

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    annuleerBewerken();
    await haalWedstrijdenOp();
  }

  async function verwijderWedstrijd(id: string) {
    const zeker = confirm(
      "Weet je zeker dat je deze wedstrijd wilt verwijderen?"
    );

    if (!zeker) return;

    const { error } = await supabase
      .from("wedstrijden")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    if (editingId === id) {
      annuleerBewerken();
    }

    setWedstrijden(wedstrijden.filter((wedstrijd) => wedstrijd.id !== id));
  }

  function renderWedstrijdRow(wedstrijd: Competition, muted = false) {
    const isEditing = editingId === wedstrijd.id;

    if (isEditing) {
      return (
        <div
          key={wedstrijd.id}
          className="rounded-2xl border border-black/10 bg-gray-50 p-5"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="text"
              value={editForm.naam}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  naam: event.target.value,
                }))
              }
              placeholder="Naam van wedstrijd"
              className="rounded-lg border px-4 py-3 md:col-span-2"
            />

            <input
              type="date"
              value={editForm.startDate}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              aria-label="Startdatum"
              className="rounded-lg border px-4 py-3"
            />

            <input
              type="date"
              value={editForm.endDate}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              aria-label="Einddatum"
              className="rounded-lg border px-4 py-3"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => void slaWedstrijdOp(wedstrijd.id)}
              disabled={opslaanLoading}
              className="rounded-xl bg-black px-4 py-2 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {opslaanLoading ? "Opslaan..." : "Opslaan"}
            </button>

            <button
              onClick={annuleerBewerken}
              disabled={opslaanLoading}
              className="rounded-xl bg-gray-200 px-4 py-2 font-semibold text-black transition hover:bg-gray-300 disabled:opacity-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={wedstrijd.id}
        className={`flex items-center justify-between gap-4 rounded-2xl border p-5 ${
          muted ? "border-gray-100 text-gray-600" : ""
        }`}
      >
        <div>
          <h3 className={`font-bold ${muted ? "font-semibold" : "text-lg"}`}>
            {wedstrijd.naam}
          </h3>

          <p className={`mt-1 ${muted ? "text-sm" : "text-gray-500"}`}>
            {formatCompetitionDateRange(
              wedstrijd.start_date,
              wedstrijd.end_date,
            )}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => startBewerken(wedstrijd)}
            className="rounded-xl bg-black px-4 py-2 text-white transition hover:bg-gray-800"
          >
            Aanpassen
          </button>

          <button
            onClick={() => void verwijderWedstrijd(wedstrijd.id)}
            className="rounded-xl bg-red-500 px-4 py-2 text-white transition hover:bg-red-600"
          >
            Verwijderen
          </button>
        </div>
      </div>
    );
  }

  const today = getTodayDateString();
  const upcomingWedstrijden = wedstrijden.filter((wedstrijd) =>
    isUpcomingCompetition(wedstrijd, today),
  );
  const pastWedstrijden = wedstrijden.filter(
    (wedstrijd) => !isUpcomingCompetition(wedstrijd, today),
  );

  return (
    <AppShell contentClassName="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Wedstrijd kalender</h1>

            <p className="text-gray-500">
              Bekijk en beheer aankomende wedstrijden.
            </p>
            {isCoach && syncMessage ? (
              <p
                className={`mt-2 text-sm ${
                  syncStatus === "error" ? "text-red-600" : "text-gray-600"
                }`}
              >
                {syncStatus === "syncing"
                  ? "KNKF-kalender synchroniseren..."
                  : syncMessage}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isCoach ? (
              <button
                type="button"
                onClick={() => void syncKnkfCalendar(true)}
                disabled={syncStatus === "syncing"}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
              >
                {syncStatus === "syncing"
                  ? "Synchroniseren..."
                  : "Sync KNKF-kalender"}
              </button>
            ) : null}
            <a
              href="/dashboard"
              className="bg-black text-white px-4 py-2 rounded-lg"
            >
              Terug naar dashboard
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Wedstrijd toevoegen</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              placeholder="Naam van wedstrijd"
              className="border rounded-lg px-4 py-3 md:col-span-2"
            />

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Startdatum"
              className="border rounded-lg px-4 py-3"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="Einddatum"
              placeholder="Einddatum (optioneel)"
              className="border rounded-lg px-4 py-3"
            />

            <button
              onClick={() => void voegWedstrijdToe()}
              disabled={toevoegenLoading}
              className="bg-black text-white rounded-lg px-4 py-3 font-semibold hover:bg-gray-800 transition disabled:opacity-50 md:col-span-4"
            >
              {toevoegenLoading ? "Toevoegen..." : "Wedstrijd toevoegen"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Aankomende wedstrijden</h2>

          {loading ? (
            <p className="text-gray-500">Wedstrijden laden...</p>
          ) : upcomingWedstrijden.length === 0 ? (
            <p className="text-gray-500">
              Er zijn nog geen aankomende wedstrijden toegevoegd.
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingWedstrijden.map((wedstrijd) =>
                renderWedstrijdRow(wedstrijd),
              )}
            </div>
          )}

          {!loading && pastWedstrijden.length > 0 && (
            <div className="mt-10 border-t border-gray-100 pt-8">
              <h2 className="text-lg font-bold mb-4 text-gray-700">
                Afgelopen wedstrijden
              </h2>
              <div className="space-y-3">
                {pastWedstrijden.map((wedstrijd) =>
                  renderWedstrijdRow(wedstrijd, true),
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
