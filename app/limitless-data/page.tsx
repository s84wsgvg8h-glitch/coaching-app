"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import { limitlessAthletesSeed } from "@/lib/limitlessAthletesSeed";

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
  const [importingSeed, setImportingSeed] = useState(false);

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [competitionMemberStatus, setCompetitionMemberStatus] =
    useState("groen");
  const [studentStatus, setStudentStatus] = useState("groen");
  const [membershipType, setMembershipType] = useState("wedstrijd lid");

  const [editingAthlete, setEditingAthlete] = useState<LimitlessAthlete | null>(
    null,
  );
  const [editFullName, setEditFullName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editMemberNumber, setEditMemberNumber] = useState("");
  const [editCompetitionMemberStatus, setEditCompetitionMemberStatus] =
    useState("groen");
  const [editStudentStatus, setEditStudentStatus] = useState("groen");
  const [editMembershipType, setEditMembershipType] = useState("wedstrijd lid");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      await importSeedAthletes();
      await loadAthletes();
    }

    init();
  }, []);

  async function importSeedAthletes() {
    const { data: existing, error: existingError } = await supabase
      .from("limitless_athletes")
      .select("member_number");

    if (existingError) {
      alert(existingError.message);
      return;
    }

    const existingNumbers = new Set(
      (existing || []).map((row) => row.member_number),
    );

    const toInsert = limitlessAthletesSeed.filter(
      (athlete) => !existingNumbers.has(athlete.member_number),
    );

    if (toInsert.length === 0) {
      return;
    }

    const { error } = await supabase.from("limitless_athletes").insert(toInsert);

    if (error) {
      alert(error.message);
    }
  }

  async function handleImportSeed() {
    setImportingSeed(true);

    try {
      await importSeedAthletes();
      await loadAthletes();
    } finally {
      setImportingSeed(false);
    }
  }

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

    if (editingAthlete?.id === id) {
      closeEditModal();
    }
  }

  function toDateInputValue(date: string) {
    return date.slice(0, 10);
  }

  function openEditModal(athlete: LimitlessAthlete) {
    setEditingAthlete(athlete);
    setEditFullName(athlete.full_name);
    setEditBirthDate(toDateInputValue(athlete.birth_date));
    setEditMemberNumber(athlete.member_number);
    setEditCompetitionMemberStatus(athlete.competition_member_status);
    setEditStudentStatus(athlete.student_status);
    setEditMembershipType(athlete.membership_type);
  }

  function closeEditModal() {
    setEditingAthlete(null);
    setEditFullName("");
    setEditBirthDate("");
    setEditMemberNumber("");
    setEditCompetitionMemberStatus("groen");
    setEditStudentStatus("groen");
    setEditMembershipType("wedstrijd lid");
  }

  async function saveAthleteEdit() {
    if (!editingAthlete) return;

    if (!editFullName.trim() || !editBirthDate || !editMemberNumber.trim()) {
      alert("Vul alle verplichte velden in");
      return;
    }

    setSavingEdit(true);

    const updatedAthlete = {
      full_name: editFullName.trim(),
      birth_date: editBirthDate,
      member_number: editMemberNumber.trim(),
      competition_member_status: editCompetitionMemberStatus,
      student_status: editStudentStatus,
      membership_type: editMembershipType,
    };

    const { error } = await supabase
      .from("limitless_athletes")
      .update(updatedAthlete)
      .eq("id", editingAthlete.id);

    setSavingEdit(false);

    if (error) {
      alert(error.message);
      return;
    }

    setAthletes((current) =>
      current.map((athlete) =>
        athlete.id === editingAthlete.id
          ? { ...athlete, ...updatedAthlete }
          : athlete,
      ),
    );

    closeEditModal();
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
    <AppShell>
      <div className="mx-auto w-full max-w-none">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Limitless Data</h1>

            <p className="text-gray-500">
              Voeg atleten toe en beheer lidgegevens.
            </p>
          </div>

          <button
            onClick={handleImportSeed}
            disabled={importingSeed}
            className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-black px-5 py-3 rounded-xl font-semibold"
          >
            {importingSeed ? "Importeren..." : "Ledenlijst importeren"}
          </button>
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(athlete)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          title="Bewerken"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Bewerken
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteAthlete(athlete.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                          title="Verwijderen"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editingAthlete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Atleet bewerken</h2>
                <p className="text-sm text-gray-500">
                  Pas de gegevens van {editingAthlete.full_name} aan.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                title="Sluiten"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Volledige naam"
                className="rounded-xl border px-4 py-3 md:col-span-2"
              />

              <input
                type="date"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
                className="rounded-xl border px-4 py-3"
              />

              <input
                value={editMemberNumber}
                onChange={(e) => setEditMemberNumber(e.target.value)}
                placeholder="Lidnummer"
                className="rounded-xl border px-4 py-3"
              />

              <select
                value={editCompetitionMemberStatus}
                onChange={(e) =>
                  setEditCompetitionMemberStatus(e.target.value)
                }
                className="rounded-xl border px-4 py-3"
              >
                <option value="groen">Wedstrijdlid: Groen</option>
                <option value="rood">Wedstrijdlid: Rood</option>
              </select>

              <select
                value={editStudentStatus}
                onChange={(e) => setEditStudentStatus(e.target.value)}
                className="rounded-xl border px-4 py-3"
              >
                <option value="groen">Studentenstatus: Groen</option>
                <option value="rood">Studentenstatus: Rood</option>
              </select>

              <select
                value={editMembershipType}
                onChange={(e) => setEditMembershipType(e.target.value)}
                className="rounded-xl border px-4 py-3 md:col-span-2"
              >
                <option value="wedstrijd lid">Wedstrijd lid</option>
                <option value="beginnerslid">Beginnerslid</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-xl px-4 py-2 font-medium text-gray-600 hover:bg-gray-100"
              >
                Annuleren
              </button>

              <button
                type="button"
                onClick={saveAthleteEdit}
                disabled={savingEdit}
                className="rounded-xl bg-black px-5 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {savingEdit ? "Opslaan..." : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
