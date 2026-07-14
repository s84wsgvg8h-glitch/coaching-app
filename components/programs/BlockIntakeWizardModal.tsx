"use client";

import { useState } from "react";
import {
  BLOCK_INTAKE_STEPS,
  saveBlockIntakeStep,
  type BlockIntakeWizard,
} from "@/lib/blockIntakeWizard";

type BlockIntakeWizardModalProps = {
  wizard: BlockIntakeWizard;
  onClose: () => void;
  onCompleted: () => void;
};

export default function BlockIntakeWizardModal({
  wizard,
  onClose,
  onCompleted,
}: BlockIntakeWizardModalProps) {
  const [stepIndex, setStepIndex] = useState(
    Math.max(0, Math.min(BLOCK_INTAKE_STEPS.length - 1, wizard.step - 1)),
  );
  const [answers, setAnswers] = useState<Record<string, string>>(
    wizard.answers || {},
  );
  const [saving, setSaving] = useState(false);

  const step = BLOCK_INTAKE_STEPS[stepIndex]!;

  async function handleNext() {
    setSaving(true);
    const nextAnswers = { ...answers, [step.key]: answers[step.key] || "" };
    const isLast = stepIndex >= BLOCK_INTAKE_STEPS.length - 1;

    await saveBlockIntakeStep(
      wizard.id,
      isLast ? BLOCK_INTAKE_STEPS.length : stepIndex + 2,
      nextAnswers,
      isLast,
    );

    setSaving(false);

    if (isLast) {
      onCompleted();
      onClose();
      return;
    }

    setStepIndex((current) => current + 1);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-app-border bg-app-surface p-6 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
          Nieuw block — stap {stepIndex + 1}/{BLOCK_INTAKE_STEPS.length}
        </p>
        <h2 className="mt-1 text-xl font-bold text-app-text">{step.title}</h2>
        <p className="mt-1 text-sm text-gray-500">{step.prompt}</p>

        <textarea
          value={answers[step.key] || ""}
          onChange={(event) =>
            setAnswers((current) => ({
              ...current,
              [step.key]: event.target.value,
            }))
          }
          rows={4}
          className="mt-4 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold"
          >
            Later
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleNext()}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? "Opslaan..."
              : stepIndex >= BLOCK_INTAKE_STEPS.length - 1
                ? "Afronden"
                : "Volgende"}
          </button>
        </div>
      </div>
    </div>
  );
}
