"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { AthleteExtraExerciseInput } from "@/lib/athleteExtraExercise";
import { scrollFieldIntoVisibleArea } from "@/lib/mobileKeyboardFieldScroll";

type AthleteAddExtraExerciseModalProps = {
  open: boolean;
  dayTitle: string;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (
    payload: Pick<AthleteExtraExerciseInput, "name" | "sets" | "reps" | "rpe">,
  ) => Promise<void>;
};

const EMPTY_FORM = {
  name: "",
  sets: "",
  reps: "",
  rpe: "",
};

export default function AthleteAddExtraExerciseModal({
  open,
  dayTitle,
  saving = false,
  onClose,
  onSubmit,
}: AthleteAddExtraExerciseModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleFieldFocus = useCallback((target: HTMLElement) => {
    const body = bodyRef.current;
    if (!body) return;
    scrollFieldIntoVisibleArea(target, body);
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (!open || !body) return;

    const mobileQuery = window.matchMedia("(max-width: 1023px)");
    if (!mobileQuery.matches) return;

    function syncFocusedField() {
      const scrollContainer = bodyRef.current;
      if (!scrollContainer) return;

      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !scrollContainer.contains(active)) {
        return;
      }

      scrollFieldIntoVisibleArea(active, scrollContainer);
    }

    function onFocusIn(event: FocusEvent) {
      const scrollContainer = bodyRef.current;
      if (!scrollContainer) return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches("input, textarea")) return;
      scrollFieldIntoVisibleArea(target, scrollContainer);
    }

    body.addEventListener("focusin", onFocusIn);
    window.visualViewport?.addEventListener("resize", syncFocusedField);
    window.visualViewport?.addEventListener("scroll", syncFocusedField);

    return () => {
      body.removeEventListener("focusin", onFocusIn);
      window.visualViewport?.removeEventListener("resize", syncFocusedField);
      window.visualViewport?.removeEventListener("scroll", syncFocusedField);
    };
  }, [open]);

  if (!open) return null;

  function updateField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName || saving) return;

    await onSubmit({
      name: trimmedName,
      sets: form.sets.trim() || "1",
      reps: form.reps.trim(),
      rpe: form.rpe.trim(),
    });
  }

  return (
    <div
      className="athlete-extra-exercise-modal-root fixed inset-0 z-[260] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="athlete-extra-exercise-title"
        className="athlete-extra-exercise-modal flex w-full max-w-md max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-0.5rem))] flex-col overflow-hidden rounded-t-3xl border border-app-border bg-app-surface shadow-2xl sm:max-h-[90dvh] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="athlete-extra-exercise-modal-header shrink-0 p-4 pb-3 sm:p-5 sm:pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-app-accent">
                Extra oefening
              </p>
              <h2
                id="athlete-extra-exercise-title"
                className="mt-0.5 text-lg font-semibold text-app-text"
              >
                Toevoegen aan {dayTitle}
              </h2>
              <p className="mt-1 text-sm text-app-muted">
                Deze oefening staat los van je programma en is duidelijk als extra
                gemarkeerd voor je coach.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn app-focus-ring shrink-0"
              aria-label="Sluiten"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={bodyRef}
          className="athlete-extra-exercise-modal-body min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5"
        >
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-app-text">
                Oefeningnaam
              </span>
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                onFocus={(event) => handleFieldFocus(event.currentTarget)}
                placeholder="Bijv. Cable flyes"
                className="w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-3 text-base text-app-text outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
                maxLength={120}
                disabled={saving}
              />
            </label>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-app-text">
                Voorgeschreven
              </span>
              <div className="grid grid-cols-3 gap-2">
                <label className="block min-w-0">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-app-muted">
                    Sets
                  </span>
                  <input
                    value={form.sets}
                    onChange={(event) =>
                      updateField("sets", event.target.value.replace(/[^0-9]/g, ""))
                    }
                    onFocus={(event) => handleFieldFocus(event.currentTarget)}
                    placeholder="3"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-3 text-base text-app-text outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
                    disabled={saving}
                  />
                </label>

                <label className="block min-w-0">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-app-muted">
                    Reps
                  </span>
                  <input
                    value={form.reps}
                    onChange={(event) => updateField("reps", event.target.value)}
                    onFocus={(event) => handleFieldFocus(event.currentTarget)}
                    placeholder="8"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-3 text-base text-app-text outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
                    disabled={saving}
                  />
                </label>

                <label className="block min-w-0">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-app-muted">
                    RPE
                  </span>
                  <input
                    value={form.rpe}
                    onChange={(event) =>
                      updateField(
                        "rpe",
                        event.target.value.replace(/[^0-9.,]/g, ""),
                      )
                    }
                    onFocus={(event) => handleFieldFocus(event.currentTarget)}
                    placeholder="8"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-3 text-base text-app-text outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
                    disabled={saving}
                  />
                </label>
              </div>
            </div>

            <div className="pb-1">
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="min-h-11 w-full rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
              >
                {saving ? "Opslaan…" : "Extra oefening toevoegen"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
