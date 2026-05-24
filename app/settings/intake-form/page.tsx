"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import {
  DEFAULT_INTAKE_FIELDS,
  loadIntakeTemplate,
  saveIntakeTemplate,
  type IntakeFormField,
} from "@/lib/intakeForm";

export default function IntakeFormSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<IntakeFormField[]>(DEFAULT_INTAKE_FIELDS);
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.title = "Intakeformulier beheren";

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
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "coach") {
        window.location.href = "/dashboard";
        return;
      }

      const template = await loadIntakeTemplate();
      setFields(template.fields);
      setLoading(false);
    }

    void load();
  }, []);

  function updateField(index: number, patch: Partial<IntakeFormField>) {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    const normalized = fields
      .map((field, index) => ({ ...field, order: index + 1 }))
      .sort((a, b) => a.order - b.order);

    const { error } = await saveIntakeTemplate(normalized);

    setSaving(false);

    if (error) {
      setMessage("Opslaan mislukt.");
      return;
    }

    setFields(normalized);
    setMessage("Intakeformulier opgeslagen.");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black shadow"
        >
          ← Terug naar dashboard
        </Link>

        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Instellingen
          </p>
          <h1 className="text-3xl font-bold text-black">Intakeformulier</h1>
          <p className="mt-2 text-gray-600">
            Pas labels en verplichte velden aan voor nieuwe atleten.
          </p>

          {loading ? (
            <p className="mt-6 text-gray-500">Laden...</p>
          ) : (
            <div className="mt-8 space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.key}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    {field.key} · {field.type}
                  </p>

                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(event) =>
                        updateField(index, { label: event.target.value })
                      }
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                    />
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(event) =>
                          updateField(index, { required: event.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Verplicht
                    </label>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Opslaan..." : "Opslaan"}
                </button>
                {message && <p className="text-sm text-gray-600">{message}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
