"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Wedstrijd = {
  id: string;
  naam: string;
  datum: string;
  created_at?: string;
};

export default function WedstrijdKalenderPage() {
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([]);
  const [naam, setNaam] = useState("");
  const [datum, setDatum] = useState("");
  const [loading, setLoading] = useState(true);
  const [toevoegenLoading, setToevoegenLoading] = useState(false);

  useEffect(() => {
    haalWedstrijdenOp();
  }, []);

  async function haalWedstrijdenOp() {
    setLoading(true);

    const { data, error } = await supabase
      .from("wedstrijden")
      .select("*")
      .order("datum", { ascending: true });

    if (error) {
      alert(error.message);
      console.error(error);
      setLoading(false);
      return;
    }

    setWedstrijden(data || []);
    setLoading(false);
  }

  async function voegWedstrijdToe() {
    if (!naam.trim() || !datum) {
      alert("Vul een wedstrijdnaam en datum in.");
      return;
    }

    setToevoegenLoading(true);

    const { error } = await supabase.from("wedstrijden").insert([
      {
        naam: naam.trim(),
        datum,
      },
    ]);

    if (error) {
      alert(error.message);
      console.error(error);
      setToevoegenLoading(false);
      return;
    }

    setNaam("");
    setDatum("");
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

  function formatDatum(datum: string) {
    return new Date(datum).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              Wedstrijd kalender
            </h1>

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
          <h2 className="text-xl font-bold mb-4">
            Wedstrijd toevoegen
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              placeholder="Naam van wedstrijd"
              className="border rounded-lg px-4 py-3"
            />

            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="border rounded-lg px-4 py-3"
            />

            <button
              onClick={voegWedstrijdToe}
              disabled={toevoegenLoading}
              className="bg-black text-white rounded-lg px-4 py-3 font-semibold hover:bg-gray-800 transition disabled:opacity-50"
            >
              {toevoegenLoading
                ? "Toevoegen..."
                : "Wedstrijd toevoegen"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            Aankomende wedstrijden
          </h2>

          {loading ? (
            <p className="text-gray-500">
              Wedstrijden laden...
            </p>
          ) : wedstrijden.length === 0 ? (
            <p className="text-gray-500">
              Er zijn nog geen wedstrijden toegevoegd.
            </p>
          ) : (
            <div className="space-y-4">
              {wedstrijden.map((wedstrijd) => (
                <div
                  key={wedstrijd.id}
                  className="border rounded-2xl p-5 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-lg">
                      {wedstrijd.naam}
                    </h3>

                    <p className="text-gray-500 mt-1">
                      {formatDatum(wedstrijd.datum)}
                    </p>
                  </div>

                  <button
                    onClick={() => verwijderWedstrijd(wedstrijd.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition"
                  >
                    Verwijderen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}