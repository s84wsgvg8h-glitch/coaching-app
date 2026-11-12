"use client";

import { useEffect, useState } from "react";
import {
  formatIntakeAnswer,
  loadAthleteIntakeResponse,
  loadIntakeTemplate,
  type IntakeFormField,
} from "@/lib/intakeForm";
import { clearIntakeTodoForAthlete } from "@/lib/coachTodoSync";
import { COACH_TODOS_CHANGED_EVENT } from "@/lib/coachTodos";

type IntakeAnswersSectionProps = {
  athleteId: string;
  coachId?: string;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
};

export default function IntakeAnswersSection({
  athleteId,
  coachId,
  className = "",
  collapsible = false,
  defaultOpen = true,
}: IntakeAnswersSectionProps) {
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(defaultOpen);
  const [fields, setFields] = useState<IntakeFormField[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const [template, response] = await Promise.all([
        loadIntakeTemplate(),
        loadAthleteIntakeResponse(athleteId),
      ]);

      if (cancelled) return;

      setFields(template.fields);
      setAnswers(response?.answers || {});
      setCompletedAt(response?.completed_at || null);
      setLoading(false);

      if (coachId && response?.completed_at) {
        await clearIntakeTodoForAthlete(coachId, athleteId);
        window.dispatchEvent(new CustomEvent(COACH_TODOS_CHANGED_EVENT));
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [athleteId, coachId]);

  const header = (
    <div className="flex w-full min-w-0 items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-app-text">Intakeformulier</h3>
        {completedAt ? (
          <p className="mt-1 text-[13px] text-app-muted">
            Ingevuld op{" "}
            {new Date(completedAt).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-app-muted">
            {loading
              ? "Antwoorden laden..."
              : "Het intakeformulier is nog niet ingevuld."}
          </p>
        )}
      </div>
      {collapsible ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-app-border bg-app-surface text-sm text-app-muted">{open ? "−" : "+"}</span>
      ) : null}
    </div>
  );

  if (loading) {
    return (
      <div className={className}>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="app-focus-ring flex min-h-[44px] w-full items-start justify-between gap-4 rounded-xl text-left"
          >
            {header}
          </button>
        ) : (
          header
        )}
        {(!collapsible || open) && (
          <p className="mt-4 text-sm text-app-muted">Intake-antwoorden laden...</p>
        )}
      </div>
    );
  }

  if (!completedAt) {
    return (
      <div className={className}>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="app-focus-ring flex min-h-[44px] w-full items-start justify-between gap-4 rounded-xl text-left"
          >
            {header}
          </button>
        ) : (
          header
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="app-focus-ring flex min-h-[44px] w-full items-start justify-between gap-4 rounded-xl text-left"
        >
          {header}
        </button>
      ) : (
        header
      )}

      {(!collapsible || open) && (
        <div className="space-y-3">
          {fields.map((field) => {
            const value = answers[field.key] || "";
            if (!value.trim()) return null;

            return (
              <div
                key={field.key}
                className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-app-subtle">
                  {field.label}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-app-text">
                  {formatIntakeAnswer(field, value)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
