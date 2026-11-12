"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import { PageContainer, PageHeader, Panel } from "@/components/ui/design-system";
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
        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
          value === "groen"
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-red-500/15 text-red-400"
        }`}
      >
        {value}
      </span>
    );
  }

  return (
    <AppShell>
      <PageContainer size="full" className="space-y-4">
        <PageHeader
          eyebrow="Ledenadministratie"
          title="Limitless Data"
          description="Voeg atleten toe en beheer lidgegevens."
          actions={
            <button
              onClick={handleImportSeed}
              disabled={importingSeed}
              className="app-btn-secondary app-focus-ring min-h-11 w-full disabled:opacity-50 sm:w-auto"
            >
              {importingSeed ? "Importeren..." : "Ledenlijst importeren"}
            </button>
          }
        />

        <Panel>
          <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-app-text">Atleet toevoegen</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Volledige naam"
              className="app-focus-ring min-h-11 min-w-0 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2.5 text-base text-app-text outline-none placeholder:text-app-subtle md:text-sm"
            />

            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="app-focus-ring min-h-11 min-w-0 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2.5 text-base text-app-text outline-none placeholder:text-app-subtle md:text-sm"
            />

            <input
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value)}
              placeholder="Lidnummer"
              className="app-focus-ring min-h-11 min-w-0 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2.5 text-base text-app-text outline-none placeholder:text-app-subtle md:text-sm"
            />

            <select
              value={competitionMemberStatus}
              onChange={(e) =>
                setCompetitionMemberStatus(e.target.value)
              }
              className="app-focus-ring min-h-11 min-w-0 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2.5 text-base text-app-text outline-none placeholder:text-app-subtle md:text-sm"
            >
              <option value="groen">Wedstrijdlid: Groen</option>
              <option value="rood">Wedstrijdlid: Rood</option>
            </select>

            <select
              value={studentStatus}
              onChange={(e) => setStudentStatus(e.target.value)}
              className="app-focus-ring min-h-11 min-w-0 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2.5 text-base text-app-text outline-none placeholder:text-app-subtle md:text-sm"
            >
              <option value="groen">Studentenstatus: Groen</option>
              <option value="rood">Studentenstatus: Rood</option>
            </select>

            <select
              value={membershipType}
              onChange={(e) => setMembershipType(e.target.value)}
              className="app-focus-ring min-h-11 min-w-0 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2.5 text-base text-app-text outline-none placeholder:text-app-subtle md:text-sm"
            >
              <option value="wedstrijd lid">Wedstrijd lid</option>
              <option value="beginnerslid">Beginnerslid</option>
            </select>
          </div>

          <button
            onClick={addAthlete}
            className="app-btn-primary app-focus-ring mt-4 min-h-11 w-full sm:w-auto"
          >
            Atleet toevoegen
          </button>
        </Panel>

        <Panel className="min-w-0">
          <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-app-text">Atleten</h2>

          {athletes.length === 0 ? (
            <p className="py-6 text-center text-sm text-app-muted">
              Er zijn nog geen atleten toegevoegd.
            </p>
          ) : (
            <div className="table-compact-wrap -mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[1000px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-app-border text-left">
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-app-subtle">Naam</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-app-subtle">Geboortedatum</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-app-subtle">Lidnummer</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-app-subtle">Wedstrijdlid</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-app-subtle">Studentenstatus</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-app-subtle">Type lid</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-app-subtle">Actie</th>
                </tr>
              </thead>

              <tbody>
                {athletes.map((athlete) => (
                  <tr
                    key={athlete.id}
                    className="border-b border-app-border transition-colors last:border-b-0 hover:bg-app-surface-hover"
                  >
                    <td className="px-4 py-3 font-medium text-app-text">
                      {athlete.full_name}
                    </td>

                    <td className="px-4 py-3 text-app-muted">
                      {formatDate(athlete.birth_date)}
                    </td>

                    <td className="px-4 py-3 text-app-muted">
                      {athlete.member_number}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge
                        value={athlete.competition_member_status}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge value={athlete.student_status} />
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full bg-app-surface-muted px-2.5 py-1 text-xs font-semibold text-app-text">
                        {athlete.membership_type}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(athlete)}
                          className="app-focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-app-border bg-app-surface px-3 text-sm font-medium text-app-text transition hover:bg-app-surface-hover"
                          title="Bewerken"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Bewerken
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteAthlete(athlete.id)}
                          className="app-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/15 text-red-400 transition hover:bg-red-500/25"
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
            </div>
          )}
        </Panel>
      </PageContainer>

      {editingAthlete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-app-border bg-app-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_24px_64px_rgba(0,0,0,0.45)] sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-semibold tracking-tight text-app-text">Atleet bewerken</h2>
                <p className="text-sm text-app-muted">
                  Pas de gegevens van {editingAthlete.full_name} aan.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                className="app-focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-app-muted transition hover:bg-app-surface-hover hover:text-app-text"
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
                className="app-focus-ring min-h-11 min-w-0 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2.5 text-base text-app-text outline-none placeholder:text-app-subtle md:col-span-2 md:text-sm"
              />

              <input
                type="date"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
                className="app-focus-ring min-h-11 min-w-0 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2.5 text-base text-app-text outline-none placeholder:text-app-subtle md:text-sm"
              />

              <input
                value={editMemberNumber}
                onChange={(e) => setEditMemberNumber(e.target.value)}
                placeholder="Lidnummer"
                className="app-focus-ring min-h-11 min-w-0 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2.5 text-base text-app-text outline-none placeholder:text-app-subtle md:text-sm"
              />

              <select
                value={editCompetitionMemberStatus}
                onChange={(e) =>
                  setEditCompetitionMemberStatus(e.target.value)
                }
                className="app-focus-ring min-h-11 min-w-0 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2.5 text-base text-app-text outline-none placeholder:text-app-subtle md:text-sm"
              >
                <option value="groen">Wedstrijdlid: Groen</option>
                <option value="rood">Wedstrijdlid: Rood</option>
              </select>

              <select
                value={editStudentStatus}
                onChange={(e) => setEditStudentStatus(e.target.value)}
                className="app-focus-ring min-h-11 min-w-0 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2.5 text-base text-app-text outline-none placeholder:text-app-subtle md:text-sm"
              >
                <option value="groen">Studentenstatus: Groen</option>
                <option value="rood">Studentenstatus: Rood</option>
              </select>

              <select
                value={editMembershipType}
                onChange={(e) => setEditMembershipType(e.target.value)}
                className="app-focus-ring min-h-11 min-w-0 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2.5 text-base text-app-text outline-none placeholder:text-app-subtle md:col-span-2 md:text-sm"
              >
                <option value="wedstrijd lid">Wedstrijd lid</option>
                <option value="beginnerslid">Beginnerslid</option>
              </select>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditModal}
                className="app-btn-secondary app-focus-ring min-h-11"
              >
                Annuleren
              </button>

              <button
                type="button"
                onClick={saveAthleteEdit}
                disabled={savingEdit}
                className="app-btn-primary app-focus-ring min-h-11 disabled:opacity-50"
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
