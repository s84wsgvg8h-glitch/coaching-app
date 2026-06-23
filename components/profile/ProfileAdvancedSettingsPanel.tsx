"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearAthleteChecklistTemplate,
  loadCompetitionChecklistTemplate,
  saveAthleteChecklistTemplate,
  type CompetitionChecklistSection,
} from "@/lib/competitionChecklist";
import CompetitionChecklistEditor, {
  useAutoSaveChecklist,
} from "@/components/profile/CompetitionChecklistEditor";
import {
  loadAthleteCoachPreferences,
  saveAthleteCoachPreferences,
} from "@/lib/athletePreferences";

type ProfileAdvancedSettingsPanelProps = {
  athleteId: string;
};

export default function ProfileAdvancedSettingsPanel({
  athleteId,
}: ProfileAdvancedSettingsPanelProps) {
  const [checklistSections, setChecklistSections] = useState<
    CompetitionChecklistSection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [checklistScope, setChecklistScope] = useState<"global" | "athlete">(
    "global",
  );
  const [showChecklistEditor, setShowChecklistEditor] = useState(false);
  const [showE1rmInline, setShowE1rmInline] = useState(true);
  const [savingE1rm, setSavingE1rm] = useState(false);

  const saveChecklist = useCallback(
    async (sections: CompetitionChecklistSection[]) => {
      const { error } = await saveAthleteChecklistTemplate(athleteId, sections);
      if (error) throw error;
    },
    [athleteId],
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
      const [template, prefs] = await Promise.all([
        loadCompetitionChecklistTemplate(athleteId),
        loadAthleteCoachPreferences(athleteId),
      ]);

      if (cancelled) return;

      setChecklistSections(template.sections);
      setChecklistScope(template.scope || "global");
      setShowE1rmInline(prefs.show_e1rm_inline);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  async function resetToGlobal() {
    const confirmed = window.confirm(
      "Atleet-specifieke checklist verwijderen en terugzetten naar de algemene checklist?",
    );

    if (!confirmed) return;

    await clearAthleteChecklistTemplate(athleteId);
    const template = await loadCompetitionChecklistTemplate(null);
    setChecklistSections(template.sections);
    setChecklistScope("global");
  }

  async function toggleE1rmInline(enabled: boolean) {
    setSavingE1rm(true);
    setShowE1rmInline(enabled);
    await saveAthleteCoachPreferences(athleteId, { show_e1rm_inline: enabled });
    setSavingE1rm(false);
  }

  if (loading) {
    return <p className="text-sm text-app-muted">Instellingen laden...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-app-text">Geavanceerde instellingen</h2>
        <p className="mt-1 text-sm text-app-muted">
          Atleet-specifieke voorkeuren en wedstrijd-checklist.
        </p>
      </div>

      <div className="rounded-2xl border border-app-border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-app-text">e1RM na elke set</p>
            <p className="text-xs text-app-muted">
              Toon geschatte 1RM inline tijdens het loggen.
            </p>
          </div>
          <button
            type="button"
            disabled={savingE1rm}
            onClick={() => void toggleE1rmInline(!showE1rmInline)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              showE1rmInline
                ? "bg-emerald-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {showE1rmInline ? "Aan" : "Uit"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-app-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-app-text">Meet-checklist</p>
            <p className="text-xs text-app-muted">
              {checklistStatus === "saving" && "Opslaan..."}
              {checklistStatus === "saved" && "Opgeslagen"}
              {checklistStatus === "error" && "Opslaan mislukt"}
              {checklistStatus === "idle" && "Wijzigingen worden automatisch opgeslagen"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {checklistScope === "athlete" ? (
              <button
                type="button"
                onClick={() => void resetToGlobal()}
                className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
              >
                Terug naar algemene checklist
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowChecklistEditor((value) => !value)}
              className="app-btn-secondary text-sm"
            >
              {showChecklistEditor ? "Checklist inklappen" : "Checklist bewerken"}
            </button>
          </div>
        </div>
        {showChecklistEditor ? (
          <div className="border-t border-app-border px-4 py-4">
            <CompetitionChecklistEditor
              compact
              title="Wedstrijd-checklist"
              description="Items die op de meet-week hub verschijnen."
              sections={checklistSections}
              onChange={setChecklistSections}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
