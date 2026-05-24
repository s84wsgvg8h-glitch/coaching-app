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

    window.location.href = "/dashboard";
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function renderField(field: IntakeFormField) {
    const value = answers[field.key] || "";
    const error = errors[field.key];
    const baseInputClass =
      "w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black";

    if (field.type === "textarea") {
      return (
        <textarea
          value={value}
          onChange={(event) => updateAnswer(field.key, event.target.value)}
          rows={4}
          className={`${baseInputClass} resize-none`}
        />
      );
    }

    if (field.type === "select") {
      return (
        <select
          value={value}
          onChange={(event) => updateAnswer(field.key, event.target.value)}
          className={baseInputClass}
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
        className={baseInputClass}
      />
    );
  }

  return (
    <main className="min-h-[100dvh] bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Welkom
            </p>
            <h1 className="text-3xl font-bold text-black">Intakeformulier</h1>
            <p className="mt-2 text-gray-600">
              Vul dit formulier in voordat je de app kunt gebruiken.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="shrink-0 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Uitloggen
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <p className="text-gray-500">Formulier laden...</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-3xl bg-white p-6 shadow-xl md:p-8"
          >
            {sortedFields.map((field) => (
              <div key={field.key}>
                <label className="mb-2 block text-sm font-semibold text-black">
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                {renderField(field)}
                {errors[field.key] && (
                  <p className="mt-1 text-sm text-red-600">{errors[field.key]}</p>
                )}
              </div>
            ))}

            {message && <p className="text-sm text-red-600">{message}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-black px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Opslaan..." : "Formulier versturen"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
