"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  applyProgramTemplate,
  loadProgramTemplates,
  saveProgramAsTemplate,
  saveWeekAsTemplate,
  type ProgramTemplateOptions,
} from "@/lib/programTemplates";

type CreateTemplateButtonProps = {
  coachId: string;
  blockId?: string;
  weekId?: string;
  actingUserId: string;
  actingRole: string;
  compact?: boolean;
  activeTone?: "dark" | "light";
};

export function CreateTemplateButton({
  coachId,
  blockId,
  weekId,
  actingUserId,
  actingRole,
  compact = false,
  activeTone = "light",
}: CreateTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeUitlegVideos, setIncludeUitlegVideos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    const options: ProgramTemplateOptions = {
      includeNotes,
      includeUitlegVideos,
    };

    const { error } = weekId
      ? await saveWeekAsTemplate(
          coachId,
          weekId,
          name,
          actingUserId,
          actingRole,
          options,
        )
      : blockId
        ? await saveProgramAsTemplate(
            coachId,
            blockId,
            name,
            actingUserId,
            actingRole,
            options,
          )
        : { error: new Error("Geen block of week geselecteerd") };

    setSaving(false);
    setMessage(error ? "Opslaan mislukt." : "Template opgeslagen.");
    if (!error) {
      setOpen(false);
      setName("");
    }
  }

  const buttonClass =
    activeTone === "dark"
      ? "bg-white/20 text-white hover:bg-white/30"
      : "bg-white text-black hover:bg-gray-100";

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className={
          compact
            ? `h-7 w-7 rounded-lg text-[10px] font-bold ${buttonClass}`
            : "app-btn-secondary text-sm"
        }
        title="Template aanmaken"
      >
        {compact ? "T" : "Template aanmaken"}
      </button>

      {open && mounted
        ? createPortal(
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-app-overlay p-4 sm:items-center">
          <button
            type="button"
            aria-label="Sluit template aanmaken"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="program-edit-modal relative z-[121] w-full max-w-md">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="program-edit-modal-close"
              aria-label="Sluiten"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <h2 className="program-edit-modal-title">Template aanmaken</h2>
            <p className="program-edit-modal-subtitle">
              {weekId ? "Sla deze week op als template." : "Sla dit block op als template."}
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Naam template"
              className="program-edit-modal-input mt-4"
            />
            <div className="mt-4 space-y-2 text-sm text-app-text">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="rounded border-app-border accent-brand-purple"
                />
                Notes meenemen
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeUitlegVideos}
                  onChange={(e) => setIncludeUitlegVideos(e.target.checked)}
                  className="rounded border-app-border accent-brand-purple"
                />
                Uitlegvideo&apos;s meenemen
              </label>
            </div>
            {message ? <p className="mt-2 text-sm text-app-muted">{message}</p> : null}
            <div className="program-edit-modal-actions">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="app-btn-secondary flex-1"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="app-btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? "Opslaan..." : "Opslaan"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </>
  );
}

type ApplyTemplateModalProps = {
  open: boolean;
  onClose: () => void;
  coachId: string;
  athleteId: string;
  actingUserId: string;
  targetBlockId?: string;
  onApplied?: (result: { blockId: string; weekId: string | null }) => void;
};

export function ApplyTemplateModal({
  open,
  onClose,
  coachId,
  athleteId,
  actingUserId,
  targetBlockId,
  onApplied,
}: ApplyTemplateModalProps) {
  const [templates, setTemplates] = useState<
    Awaited<ReturnType<typeof loadProgramTemplates>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState("");

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    void loadProgramTemplates(coachId).then((rows) => {
      setTemplates(rows);
      setLoading(false);
    });
  }, [coachId, open]);

  async function handleApply(templateId: string) {
    setApplying(templateId);
    const { blockId, weekId, error } = await applyProgramTemplate(
      templateId,
      athleteId,
      actingUserId,
      undefined,
      targetBlockId,
    );
    setApplying("");
    if (blockId) {
      onApplied?.({ blockId, weekId });
      onClose();
    } else if (error) {
      alert(error);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-app-overlay p-4">
      <div className="app-card w-full max-w-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-app-text">Template toepassen</h2>
            <p className="mt-1 text-sm text-app-muted">
              Kies een opgeslagen block- of weektemplate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-app-muted hover:bg-app-surface-muted"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-app-muted">Templates laden...</p>
        ) : templates.length === 0 ? (
          <p className="mt-4 text-sm text-app-muted">
            Nog geen templates. Maak er een via ✎ / ⧉ naast een block of week.
          </p>
        ) : (
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {templates.map((template) => {
              const scope =
                (template.structure as { scope?: string })?.scope || "block";

              return (
                <div
                  key={template.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-app-border p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-app-text">
                      {template.name}
                    </p>
                    <p className="text-xs text-app-muted">
                      {scope === "week" ? "Weektemplate" : "Blocktemplate"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleApply(template.id)}
                    disabled={applying === template.id}
                    className="app-btn-primary text-xs disabled:opacity-60"
                  >
                    {applying === template.id ? "Toepassen..." : "Toepassen"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
