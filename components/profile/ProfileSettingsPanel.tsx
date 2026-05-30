"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  DEFAULT_INTAKE_FIELDS,
  loadIntakeTemplate,
  saveIntakeTemplate,
  type IntakeFormField,
} from "@/lib/intakeForm";
import {
  clearAthleteChecklistTemplate,
  loadCompetitionChecklistTemplate,
  saveAthleteChecklistTemplate,
  saveCompetitionChecklistTemplate,
  type CompetitionChecklistSection,
} from "@/lib/competitionChecklist";
import CompetitionChecklistEditor, {
  cleanChecklistSections,
  useAutoSaveChecklist,
} from "@/components/profile/CompetitionChecklistEditor";

type ProfileSettingsPanelProps = {
  coachUserId: string;
  athleteId?: string | null;
};

export default function ProfileSettingsPanel({
  coachUserId,
  athleteId = null,
}: ProfileSettingsPanelProps) {
  const isAthleteOverride = Boolean(athleteId);
  const [checklistSections, setChecklistSections] = useState<
    CompetitionChecklistSection[]
  >([]);
  const [intakeFields, setIntakeFields] = useState<IntakeFormField[]>(
    DEFAULT_INTAKE_FIELDS,
  );
  const [loading, setLoading] = useState(true);
  const [intakeMessage, setIntakeMessage] = useState("");
  const [intakeSaving, setIntakeSaving] = useState(false);
  const [checklistScope, setChecklistScope] = useState<"global" | "athlete">(
    "global",
  );

  const saveChecklist = useCallback(
    async (sections: CompetitionChecklistSection[]) => {
      if (isAthleteOverride && athleteId) {
        const { error } = await saveAthleteChecklistTemplate(athleteId, sections);
        if (error) throw error;
        return;
      }

      const { error } = await saveCompetitionChecklistTemplate(sections);
      if (error) throw error;
    },
    [athleteId, isAthleteOverride],
  );

  const checklistStatus = useAutoSaveChecklist(
    checklistSections,
    saveChecklist,
    !loading,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const [checklistTemplate, intakeTemplate] = await Promise.all([
        loadCompetitionChecklistTemplate(athleteId),
        isAthleteOverride ? Promise.resolve(null) : loadIntakeTemplate(),
      ]);

      if (cancelled) return;

      setChecklistSections(checklistTemplate.sections);
      setChecklistScope(checklistTemplate.scope || "global");

      if (intakeTemplate) {
        setIntakeFields(intakeTemplate.fields);
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [athleteId, isAthleteOverride]);

  async function handleSaveIntake() {
    setIntakeSaving(true);
    setIntakeMessage("");

    const normalized = intakeFields
      .map((field, index) => ({ ...field, order: index + 1 }))
      .sort((a, b) => a.order - b.order);

    const { error } = await saveIntakeTemplate(normalized);

    setIntakeSaving(false);

    if (error) {
      setIntakeMessage("Intake opslaan mislukt.");
      return;
    }

    setIntakeFields(normalized);
    setIntakeMessage("Intakeformulier opgeslagen.");
  }

  async function resetAthleteChecklistToGlobal() {
    if (!athleteId) return;

    const confirmed = window.confirm(
      "Atleet-specifieke checklist verwijderen en terugzetten naar de algemene checklist?",
    );

    if (!confirmed) return;

    await clearAthleteChecklistTemplate(athleteId);
    const template = await loadCompetitionChecklistTemplate(null);
    setChecklistSections(template.sections);
    setChecklistScope("global");
  }

  if (loading) {
    return <p className="text-sm text-app-muted">Instellingen laden...</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-app-muted">
            {checklistStatus === "saving" && "Checklist opslaan..."}
            {checklistStatus === "saved" && "Checklist opgeslagen"}
            {checklistStatus === "error" && "Checklist opslaan mislukt"}
            {checklistStatus === "idle" &&
              "Checklist wijzigingen worden automatisch opgeslagen"}
          </p>
          {isAthleteOverride && checklistScope === "athlete" ? (
            <button
              type="button"
              onClick={() => void resetAthleteChecklistToGlobal()}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
            >
              Terug naar algemene checklist
            </button>
          ) : null}
        </div>

        <CompetitionChecklistEditor
          compact
          title={
            isAthleteOverride
              ? "Checklist voor deze atleet"
              : "Algemene wedstrijd checklist"
          }
          description={
            isAthleteOverride
              ? "Pas de checklist alleen voor deze atleet aan. Andere atleten gebruiken de algemene checklist."
              : "Deze checklist geldt voor alle atleten zonder eigen override."
          }
          sections={checklistSections}
          onChange={setChecklistSections}
        />
      </div>

      {!isAthleteOverride ? (
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-xl font-bold text-app-text">Intakeformulier</h2>
          <p className="mt-1 text-sm text-app-muted">
            Labels en verplichte velden voor nieuwe atleten.
          </p>

          <div className="mt-4 space-y-2">
            {intakeFields.map((field, index) => (
              <div
                key={field.key}
                className="grid gap-2 rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 md:grid-cols-[120px_minmax(0,1fr)_auto]"
              >
                <span className="text-xs font-bold uppercase text-gray-400">
                  {field.key}
                </span>
                <input
                  type="text"
                  value={field.label}
                  onChange={(event) =>
                    setIntakeFields((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, label: event.target.value }
                          : item,
                      ),
                    )
                  }
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-black"
                />
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(field.required)}
                    onChange={(event) =>
                      setIntakeFields((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, required: event.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  Verplicht
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSaveIntake()}
              disabled={intakeSaving}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {intakeSaving ? "Opslaan..." : "Intake opslaan"}
            </button>
            {intakeMessage ? (
              <span className="text-sm text-app-muted">{intakeMessage}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
