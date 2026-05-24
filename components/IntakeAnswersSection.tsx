"use client";

import { useEffect, useState } from "react";
import {
  formatIntakeAnswer,
  loadAthleteIntakeResponse,
  loadIntakeTemplate,
  type IntakeFormField,
} from "@/lib/intakeForm";

type IntakeAnswersSectionProps = {
  athleteId: string;
  className?: string;
};

export default function IntakeAnswersSection({
  athleteId,
  className = "",
}: IntakeAnswersSectionProps) {
  const [loading, setLoading] = useState(true);
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
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  if (loading) {
    return (
      <div className={className}>
        <p className="text-sm text-gray-500">Intake-antwoorden laden...</p>
      </div>
    );
  }

  if (!completedAt) {
    return (
      <div className={className}>
        <h3 className="text-lg font-bold text-black">Intakeformulier</h3>
        <p className="mt-2 text-sm text-gray-500">
          Deze atleet heeft het intakeformulier nog niet ingevuld.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-bold text-black">Intakeformulier</h3>
        <p className="mt-1 text-sm text-gray-500">
          Ingevuld op{" "}
          {new Date(completedAt).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

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
              <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-black">
                {formatIntakeAnswer(field, value)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
