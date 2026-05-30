"use client";

import { useEffect, useState } from "react";
import { applyProgramTemplate, loadProgramTemplates, saveProgramAsTemplate } from "@/lib/programTemplates";

type SaveTemplateButtonProps = {
  coachId: string;
  blockId: string;
  actingUserId: string;
  actingRole: string;
};

export function SaveTemplateButton({
  coachId,
  blockId,
  actingUserId,
  actingRole,
}: SaveTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await saveProgramAsTemplate(
      coachId,
      blockId,
      name,
      actingUserId,
      actingRole,
    );
    setSaving(false);
    setMessage(error ? "Opslaan mislukt." : "Sjabloon opgeslagen.");
    if (!error) {
      setOpen(false);
      setName("");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="app-btn-secondary text-sm"
      >
        Opslaan als sjabloon
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-app-overlay p-4">
          <div className="app-card w-full max-w-md">
            <h2 className="text-lg font-bold">Opslaan als sjabloon</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Naam sjabloon"
              className="mt-4 w-full rounded-xl border border-app-border px-3 py-2 text-sm app-focus-ring"
            />
            {message ? <p className="mt-2 text-sm text-app-muted">{message}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="app-btn-secondary">
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="app-btn-primary"
              >
                {saving ? "Opslaan..." : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

type ApplyTemplatePanelProps = {
  coachId: string;
  athleteId: string;
  actingUserId: string;
  onApplied?: (blockId: string) => void;
};

export function ApplyTemplatePanel({
  coachId,
  athleteId,
  actingUserId,
  onApplied,
}: ApplyTemplatePanelProps) {
  const [templates, setTemplates] = useState<
    Awaited<ReturnType<typeof loadProgramTemplates>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState("");

  useEffect(() => {
    void loadProgramTemplates(coachId).then((rows) => {
      setTemplates(rows);
      setLoading(false);
    });
  }, [coachId]);

  async function handleApply(templateId: string) {
    setApplying(templateId);
    const { blockId, error } = await applyProgramTemplate(
      templateId,
      athleteId,
      actingUserId,
    );
    setApplying("");
    if (blockId) onApplied?.(blockId);
    else if (error) alert(error);
  }

  if (loading) return <p className="text-sm text-app-muted">Sjablonen laden...</p>;
  if (templates.length === 0) return null;

  return (
    <div className="app-card space-y-3">
      <h3 className="font-bold text-app-text">Sjabloon toepassen</h3>
      <div className="space-y-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-app-border p-3"
          >
            <span className="text-sm font-semibold">{template.name}</span>
            <button
              type="button"
              onClick={() => void handleApply(template.id)}
              disabled={applying === template.id}
              className="app-btn-primary text-xs disabled:opacity-60"
            >
              {applying === template.id ? "Toepassen..." : "Toepassen"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
