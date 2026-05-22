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

export default function WedstrijdKalenderPage() {
  const [wedstrijden, setWedstrijden] = useState<Competition[]>([]);
  const [naam, setNaam] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [toevoegenLoading, setToevoegenLoading] = useState(false);

  useEffect(() => {
    void haalWedstrijdenOp();
  }, []);

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

    setWedstrijden(
      wedstrijden.filter((wedstrijd) => wedstrijd.id !== id)
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Wedstrijd kalender</h1>

            <p className="text-gray-500">
              Bekijk en beheer aankomende wedstrijden.
            </p>
          </div>

          <a
            href="/dashboard"
            className="bg-black text-white px-4 py-2 rounded-lg"
          >
            Terug naar dashboard
          </a>
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
              onClick={voegWedstrijdToe}
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
              {upcomingWedstrijden.map((wedstrijd) => (
                <div
                  key={wedstrijd.id}
                  className="border rounded-2xl p-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-bold text-lg">{wedstrijd.naam}</h3>

                    <p className="text-gray-500 mt-1">
                      {formatCompetitionDateRange(
                        wedstrijd.start_date,
                        wedstrijd.end_date,
                      )}
                    </p>
                  </div>

                  <button
                    onClick={() => verwijderWedstrijd(wedstrijd.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition shrink-0"
                  >
                    Verwijderen
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && pastWedstrijden.length > 0 && (
            <div className="mt-10 border-t border-gray-100 pt-8">
              <h2 className="text-lg font-bold mb-4 text-gray-700">
                Afgelopen wedstrijden
              </h2>
              <div className="space-y-3">
                {pastWedstrijden.map((wedstrijd) => (
                  <div
                    key={wedstrijd.id}
                    className="rounded-2xl border border-gray-100 p-4 text-gray-600"
                  >
                    <h3 className="font-semibold">{wedstrijd.naam}</h3>
                    <p className="mt-1 text-sm">
                      {formatCompetitionDateRange(
                        wedstrijd.start_date,
                        wedstrijd.end_date,
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
