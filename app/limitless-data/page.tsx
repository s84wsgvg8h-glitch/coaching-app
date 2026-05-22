"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";

type LimitlessAthlete = {
  id: string;
  full_name: string;
  birth_date: string;
  member_number: string;
  competition_member_status: string;
  student_status: string;
  membership_type: string;
};

export default function LimitlessDataPage() {
  const [athletes, setAthletes] = useState<LimitlessAthlete[]>([]);

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [competitionMemberStatus, setCompetitionMemberStatus] =
    useState("groen");
  const [studentStatus, setStudentStatus] = useState("groen");
  const [membershipType, setMembershipType] = useState("wedstrijd lid");

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      await loadAthletes();
    }

    init();
  }, []);

  async function loadAthletes() {
    const { data, error } = await supabase
      .from("limitless_athletes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setAthletes(data || []);
  }

  async function addAthlete() {
    if (!fullName.trim() || !birthDate || !memberNumber.trim()) {
      alert("Vul alle verplichte velden in");
      return;
    }

    const { error } = await supabase.from("limitless_athletes").insert({
      full_name: fullName.trim(),
      birth_date: birthDate,
      member_number: memberNumber.trim(),
      competition_member_status: competitionMemberStatus,
      student_status: studentStatus,
      membership_type: membershipType,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setFullName("");
    setBirthDate("");
    setMemberNumber("");
    setCompetitionMemberStatus("groen");
    setStudentStatus("groen");
    setMembershipType("wedstrijd lid");

    await loadAthletes();
  }

  async function deleteAthlete(id: string) {
    const zeker = confirm("Weet je zeker dat je deze atleet wilt verwijderen?");

    if (!zeker) return;

    const { error } = await supabase
      .from("limitless_athletes")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setAthletes(athletes.filter((athlete) => athlete.id !== id));
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function StatusBadge({ value }: { value: string }) {
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold ${
          value === "groen"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {value}
      </span>
    );
  }

  return (
    <AppShell contentClassName="flex-1 p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Limitless Data</h1>

            <p className="text-gray-500">
              Voeg atleten toe en beheer lidgegevens.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Atleet toevoegen</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Volledige naam"
              className="border rounded-xl px-4 py-3"
            />

            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="border rounded-xl px-4 py-3"
            />

            <input
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value)}
              placeholder="Lidnummer"
              className="border rounded-xl px-4 py-3"
            />

            <select
              value={competitionMemberStatus}
              onChange={(e) =>
                setCompetitionMemberStatus(e.target.value)
              }
              className="border rounded-xl px-4 py-3"
            >
              <option value="groen">Wedstrijdlid: Groen</option>
              <option value="rood">Wedstrijdlid: Rood</option>
            </select>

            <select
              value={studentStatus}
              onChange={(e) => setStudentStatus(e.target.value)}
              className="border rounded-xl px-4 py-3"
            >
              <option value="groen">Studentenstatus: Groen</option>
              <option value="rood">Studentenstatus: Rood</option>
            </select>

            <select
              value={membershipType}
              onChange={(e) => setMembershipType(e.target.value)}
              className="border rounded-xl px-4 py-3"
            >
              <option value="wedstrijd lid">Wedstrijd lid</option>
              <option value="beginnerslid">Beginnerslid</option>
            </select>
          </div>

          <button
            onClick={addAthlete}
            className="mt-4 bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800"
          >
            Atleet toevoegen
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 overflow-x-auto">
          <h2 className="text-xl font-bold mb-4">Atleten</h2>

          {athletes.length === 0 ? (
            <p className="text-gray-500">
              Er zijn nog geen atleten toegevoegd.
            </p>
          ) : (
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-3 px-4">Naam</th>
                  <th className="py-3 px-4">Geboortedatum</th>
                  <th className="py-3 px-4">Lidnummer</th>
                  <th className="py-3 px-4">Wedstrijdlid</th>
                  <th className="py-3 px-4">Studentenstatus</th>
                  <th className="py-3 px-4">Type lid</th>
                  <th className="py-3 px-4">Actie</th>
                </tr>
              </thead>

              <tbody>
                {athletes.map((athlete) => (
                  <tr
                    key={athlete.id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="py-4 px-4 font-semibold">
                      {athlete.full_name}
                    </td>

                    <td className="py-4 px-4 text-gray-600">
                      {formatDate(athlete.birth_date)}
                    </td>

                    <td className="py-4 px-4 text-gray-600">
                      {athlete.member_number}
                    </td>

                    <td className="py-4 px-4">
                      <StatusBadge
                        value={athlete.competition_member_status}
                      />
                    </td>

                    <td className="py-4 px-4">
                      <StatusBadge value={athlete.student_status} />
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                        {athlete.membership_type}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <button
                        onClick={() => deleteAthlete(athlete.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl"
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
