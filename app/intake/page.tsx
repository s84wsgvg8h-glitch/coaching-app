"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  loadAthleteIntakeResponse,
  loadIntakeTemplate,
  saveAthleteIntakeResponse,
  validateIntakeAnswers,
  type IntakeFormField,
} from "@/lib/intakeForm";
import OnboardingProgress from "@/components/OnboardingProgress";
import { trackEvent } from "@/lib/analytics";

export default function IntakePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [fields, setFields] = useState<IntakeFormField[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.title = "Intakeformulier";
    trackEvent("intake_started");
  }, []);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, intake_completed_at, full_name")
        .eq("id", user.id)
        .single();

      if (profile?.role === "pending") {
        window.location.href = "/pending-approval";
        return;
      }

      if (profile?.role !== "atleet") {
        window.location.href = "/dashboard";
        return;
      }

      if (profile.intake_completed_at) {
        window.location.href = "/dashboard";
        return;
      }

      setUserId(user.id);

      const [template, response] = await Promise.all([
        loadIntakeTemplate(),
        loadAthleteIntakeResponse(user.id),
      ]);

      setFields(template.fields);

      const initialAnswers: Record<string, string> = {
        ...(response?.answers || {}),
      };

      if (!initialAnswers.name && profile.full_name) {
        initialAnswers.name = profile.full_name;
      }

      setAnswers(initialAnswers);
      setLoading(false);
    }

    void load();
  }, []);

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.order - b.order),
    [fields],
  );

  function updateAnswer(key: string, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;

    const validationErrors = validateIntakeAnswers(sortedFields, answers);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setMessage("Controleer de verplichte velden.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await saveAthleteIntakeResponse(userId, answers, true);

    setSaving(false);

    if (error) {
      setMessage("Opslaan mislukt. Probeer het opnieuw.");
      return;
    }

    trackEvent("intake_completed");
    window.location.href = "/dashboard";
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function fieldClass(hasError: boolean) {
    return `ui-auth-input w-full px-3.5 py-3 text-[15px] text-app-text outline-none app-focus-ring ${
      hasError ? "border-app-destructive/60 ring-1 ring-app-destructive/30" : ""
    }`;
  }

  function renderField(field: IntakeFormField) {
    const value = answers[field.key] || "";
    const error = errors[field.key];
    const inputClass = fieldClass(Boolean(error));

    if (field.type === "textarea") {
      return (
        <textarea
          value={value}
          onChange={(event) => updateAnswer(field.key, event.target.value)}
          rows={4}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${field.key}-error` : undefined}
          className={`${inputClass} resize-none`}
        />
      );
    }

    if (field.type === "select") {
      return (
        <select
          value={value}
          onChange={(event) => updateAnswer(field.key, event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${field.key}-error` : undefined}
          className={inputClass}
        >
          <option value="">Kies...</option>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type === "number" ? "text" : field.type}
        inputMode={field.type === "number" ? "decimal" : undefined}
        value={value}
        onChange={(event) => updateAnswer(field.key, event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${field.key}-error` : undefined}
        className={inputClass}
      />
    );
  }

  return (
    <main className="auth-shell relative flex h-[100dvh] min-h-0 items-start justify-center overflow-y-auto overscroll-contain px-4 py-8 pt-safe pb-safe [-webkit-overflow-scrolling:touch]">
      <div className="auth-shell-glow pointer-events-none" aria-hidden="true" />
      <div className="ui-auth-card animate-fade-in w-full max-w-2xl">
        <OnboardingProgress />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium tracking-wide text-app-accent">
              Limitless Coaching
            </p>
            <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-app-text">
              Intakeformulier
            </h1>
            <p className="mt-2 text-[14px] font-normal leading-relaxed text-app-muted">
              Vul dit formulier zo volledig mogelijk in. Je antwoorden helpen
              je coach om programma, planning en coaching op jou af te stemmen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="app-btn-secondary shrink-0 !px-3 !py-2 text-[12px]"
          >
            Uitloggen
          </button>
        </div>

        {loading ? (
          <p className="text-[14px] text-app-muted">Formulier laden…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {sortedFields.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-app-muted">
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                {field.description ? (
                  <p className="mb-2 text-[13px] leading-6 text-app-muted">
                    {field.description}
                  </p>
                ) : null}
                {renderField(field)}
                {errors[field.key] ? (
                  <p
                    id={`${field.key}-error`}
                    className="mt-1.5 text-[12px] text-app-destructive"
                    role="alert"
                  >
                    {errors[field.key]}
                  </p>
                ) : null}
              </label>
            ))}

            {message ? (
              <p className="text-[13px] text-app-destructive" role="alert">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="app-btn-primary w-full min-h-[48px] disabled:opacity-60"
            >
              {saving ? "Opslaan…" : "Formulier versturen"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
