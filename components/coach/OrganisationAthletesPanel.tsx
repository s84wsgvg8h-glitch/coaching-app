"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, Loader2, Plus, Users, X } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import {
  createOrganizationMember,
  formatAthleteBirthDate,
  updateCoachOrganisationAthlete,
  type CoachOrganisationRow,
} from "@/lib/coachOrganisationOverview";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";
import {
  formatOptionalTextFieldInputValue,
  isOptionalTextFieldComplete,
  parseOptionalTextFieldInput,
} from "@/lib/optionalFieldDash";

type RowDraft = {
  fullName: string;
  geboortedatum: string;
  lidnummer: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type OrganisationAthletesPanelProps = {
  coachId: string;
  rows: CoachOrganisationRow[];
  onRowsChange: (rows: CoachOrganisationRow[]) => void;
};

function toDraft(row: CoachOrganisationRow): RowDraft {
  return {
    fullName: row.fullName,
    geboortedatum: row.geboortedatum || "",
    lidnummer: formatOptionalTextFieldInputValue(row.lidnummer),
  };
}

function draftsEqual(a: RowDraft, b: RowDraft) {
  return (
    a.fullName === b.fullName &&
    a.geboortedatum === b.geboortedatum &&
    a.lidnummer === b.lidnummer
  );
}

export default function OrganisationAthletesPanel({
  coachId,
  rows,
  onRowsChange,
}: OrganisationAthletesPanelProps) {
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );
  const [newMember, setNewMember] = useState({
    fullName: "",
    geboortedatum: "",
    lidnummer: "",
  });
  const saveTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    deferEffectUpdate(() => {
      setDrafts((current) => {
        const next = { ...current };
        for (const row of rows) {
          if (!next[row.id]) {
            next[row.id] = toDraft(row);
          }
        }
        for (const id of Object.keys(next)) {
          if (!rows.some((row) => row.id === id)) {
            delete next[id];
          }
        }
        return next;
      });
    });
  }, [rows]);

  useEffect(() => {
    return () => {
      for (const timer of Object.values(saveTimersRef.current)) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      const draft = drafts[row.id] || toDraft(row);
      const birthDate = formatAthleteBirthDate(draft.geboortedatum) || "";
      return (
        draft.fullName.toLowerCase().includes(query) ||
        draft.lidnummer.toLowerCase().includes(query) ||
        birthDate.toLowerCase().includes(query)
      );
    });
  }, [rows, search, drafts]);

  const stats = useMemo(() => {
    const clubMembers = rows.filter((row) => !row.isAppAthlete).length;
    const missingBirthDate = rows.filter((row) => !row.geboortedatum?.trim()).length;
    const missingMembership = rows.filter(
      (row) => !isOptionalTextFieldComplete(row.lidnummer),
    ).length;
    return {
      total: rows.length,
      clubMembers,
      missingBirthDate,
      missingMembership,
    };
  }, [rows]);

  const markSaved = useCallback((id: string) => {
    setSaveStates((current) => ({ ...current, [id]: "saved" }));
    const timer = window.setTimeout(() => {
      setSaveStates((current) => ({ ...current, [id]: "idle" }));
    }, 1800);
    saveTimersRef.current[id] = timer;
  }, []);

  const saveRow = useCallback(
    async (row: CoachOrganisationRow, draft: RowDraft, baseline: RowDraft) => {
      if (draftsEqual(draft, baseline)) return;

      setSaveStates((current) => ({ ...current, [row.id]: "saving" }));

      const { error } = await updateCoachOrganisationAthlete(row, {
        fullName: draft.fullName,
        geboortedatum: draft.geboortedatum || null,
        lidnummer: parseOptionalTextFieldInput(draft.lidnummer),
      });

      if (error) {
        setSaveStates((current) => ({ ...current, [row.id]: "error" }));
        return;
      }

      onRowsChange(
        rows.map((entry) =>
          entry.id === row.id
            ? {
                ...entry,
                fullName: draft.fullName.trim() || "Naamloos",
                geboortedatum: draft.geboortedatum || null,
                lidnummer: parseOptionalTextFieldInput(draft.lidnummer),
              }
            : entry,
        ),
      );
      markSaved(row.id);
    },
    [markSaved, onRowsChange, rows],
  );

  const updateDraft = (id: string, patch: Partial<RowDraft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || toDraft(rows.find((row) => row.id === id)!)),
        ...patch,
      },
    }));
  };

  const handleBlur = (row: CoachOrganisationRow) => {
    const draft = drafts[row.id] || toDraft(row);
    void saveRow(row, draft, toDraft(row));
  };

  async function handleCreateMember(event: React.FormEvent) {
    event.preventDefault();
    if (!newMember.fullName.trim()) return;

    setCreating(true);
    setBanner(null);

    const { data, error } = await createOrganizationMember(coachId, {
      fullName: newMember.fullName,
      geboortedatum: newMember.geboortedatum || null,
      lidnummer: parseOptionalTextFieldInput(newMember.lidnummer),
    });

    setCreating(false);

    if (error || !data) {
      setBanner({ tone: "error", text: error || "Lid toevoegen mislukt." });
      return;
    }

    onRowsChange([...rows, data].sort((a, b) => a.fullName.localeCompare(b.fullName, "nl")));
    setNewMember({ fullName: "", geboortedatum: "", lidnummer: "" });
    setShowAddForm(false);
    setBanner({ tone: "success", text: `${data.fullName} toegevoegd aan de vereniging.` });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="organisatie-stat-card">
          <div className="organisatie-stat-icon organisatie-stat-icon--blue">
            <Users className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="organisatie-stat-label">Totaal</p>
            <p className="organisatie-stat-value">{stats.total}</p>
          </div>
        </div>
        <div className="organisatie-stat-card">
          <div className="organisatie-stat-icon organisatie-stat-icon--purple">
            <Building2 className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="organisatie-stat-label">Verenigingsleden</p>
            <p className="organisatie-stat-value">{stats.clubMembers}</p>
          </div>
        </div>
        <div className="organisatie-stat-card">
          <div className="organisatie-stat-icon organisatie-stat-icon--amber">
            <Check className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="organisatie-stat-label">Compleet</p>
            <p className="organisatie-stat-value">
              {stats.total - Math.max(stats.missingBirthDate, stats.missingMembership)}
            </p>
            <p className="text-[11px] text-app-muted">
              {stats.missingBirthDate > 0 || stats.missingMembership > 0
                ? `${stats.missingBirthDate} zonder datum · ${stats.missingMembership} zonder nr.`
                : "Alle gegevens ingevuld"}
            </p>
          </div>
        </div>
      </div>

      <section className="organisatie-panel premium-card glass-accent-card overflow-hidden">
        <div className="organisatie-toolbar">
          <div className="min-w-0 flex-1 sm:max-w-sm">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Zoek op naam, datum of lidnummer…"
              variant="rounded"
              aria-label="Zoek leden"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((open) => !open)}
            className="organisatie-add-btn app-focus-ring"
          >
            {showAddForm ? (
              <>
                <X className="h-4 w-4" strokeWidth={2} />
                Sluiten
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" strokeWidth={2} />
                Lid toevoegen
              </>
            )}
          </button>
        </div>

        {banner ? (
          <div
            className={`organisatie-banner ${
              banner.tone === "success"
                ? "organisatie-banner--success"
                : "organisatie-banner--error"
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        {showAddForm ? (
          <form onSubmit={(event) => void handleCreateMember(event)} className="organisatie-add-form">
            <div className="organisatie-add-form-header">
              <div>
                <h3 className="text-[15px] font-semibold text-app-text">Nieuw verenigingslid</h3>
                <p className="mt-0.5 text-[12px] text-app-muted">
                  Alleen voor de ledenadministratie — geen app-account.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="organisatie-field">
                <span className="organisatie-field-label">Volledige naam *</span>
                <input
                  type="text"
                  required
                  value={newMember.fullName}
                  onChange={(event) =>
                    setNewMember((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  className="organisatie-input"
                  placeholder="Bijv. Jan de Vries"
                  autoFocus
                />
              </label>
              <label className="organisatie-field">
                <span className="organisatie-field-label">Geboortedatum</span>
                <input
                  type="date"
                  value={newMember.geboortedatum}
                  onChange={(event) =>
                    setNewMember((current) => ({
                      ...current,
                      geboortedatum: event.target.value,
                    }))
                  }
                  className="organisatie-input"
                />
              </label>
              <label className="organisatie-field">
                <span className="organisatie-field-label">Lidnummer</span>
                <input
                  type="text"
                  value={newMember.lidnummer}
                  onChange={(event) =>
                    setNewMember((current) => ({
                      ...current,
                      lidnummer: event.target.value,
                    }))
                  }
                  className="organisatie-input"
                  placeholder="Bijv. 551135"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={creating || !newMember.fullName.trim()}
                className="organisatie-add-btn organisatie-add-btn--submit disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Bezig…
                  </>
                ) : (
                  "Toevoegen"
                )}
              </button>
            </div>
          </form>
        ) : null}

        {filteredRows.length === 0 ? (
          <div className="organisatie-empty">
            {rows.length === 0
              ? "Nog geen leden. Voeg een verenigingslid toe of vul gegevens in bij je coaching-atleten."
              : "Geen leden gevonden voor deze zoekopdracht."}
          </div>
        ) : (
          <div className="table-compact-wrap overflow-x-auto">
            <table className="organisatie-table min-w-full">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Geboortedatum</th>
                  <th>Lidnummer</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const draft = drafts[row.id] || toDraft(row);
                  const saveState = saveStates[row.id] || "idle";

                  return (
                    <tr key={`${row.source}-${row.id}`} className="organisatie-row">
                      <td>
                        <div className="flex min-w-[180px] flex-col gap-1.5">
                          <input
                            type="text"
                            value={draft.fullName}
                            onChange={(event) =>
                              updateDraft(row.id, { fullName: event.target.value })
                            }
                            onBlur={() => handleBlur(row)}
                            className="organisatie-input organisatie-input--cell"
                            aria-label={`Naam ${row.fullName}`}
                          />
                          {row.isAppAthlete ? (
                            <span className="organisatie-tag organisatie-tag--app">
                              Coaching-atleet
                            </span>
                          ) : (
                            <span className="organisatie-tag organisatie-tag--club">
                              Vereniging
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <input
                          type="date"
                          value={draft.geboortedatum}
                          onChange={(event) =>
                            updateDraft(row.id, { geboortedatum: event.target.value })
                          }
                          onBlur={() => handleBlur(row)}
                          className="organisatie-input organisatie-input--cell min-w-[140px]"
                          aria-label={`Geboortedatum ${row.fullName}`}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={draft.lidnummer}
                          onChange={(event) =>
                            updateDraft(row.id, { lidnummer: event.target.value })
                          }
                          onBlur={() => handleBlur(row)}
                          className="organisatie-input organisatie-input--cell min-w-[120px]"
                  placeholder="-"
                  aria-label={`Lidnummer ${row.fullName}`}
                        />
                      </td>
                      <td className="text-right">
                        {saveState === "saving" ? (
                          <span className="organisatie-save organisatie-save--saving">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          </span>
                        ) : null}
                        {saveState === "saved" ? (
                          <span className="organisatie-save organisatie-save--saved">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                        {saveState === "error" ? (
                          <span className="organisatie-save organisatie-save--error">!</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
