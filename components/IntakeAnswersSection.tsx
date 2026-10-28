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
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-bold text-app-text">Intakeformulier</h3>
        {completedAt ? (
          <p className="mt-1 text-sm text-gray-500">
            Ingevuld op{" "}
            {new Date(completedAt).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? "Antwoorden laden..."
              : "Het intakeformulier is nog niet ingevuld."}
          </p>
        )}
      </div>
      {collapsible ? (
        <span className="shrink-0 text-sm text-gray-400">{open ? "−" : "+"}</span>
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
            className="flex w-full items-start justify-between gap-4 text-left"
          >
            {header}
          </button>
        ) : (
          header
        )}
        {(!collapsible || open) && (
          <p className="mt-4 text-sm text-gray-500">Intake-antwoorden laden...</p>
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
            className="flex w-full items-start justify-between gap-4 text-left"
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
          className="flex w-full items-start justify-between gap-4 text-left"
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
                className="rounded-2xl border border-gray-200 px-4 py-3"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
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
