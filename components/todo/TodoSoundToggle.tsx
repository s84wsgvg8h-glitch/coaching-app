"use client";

import { Volume2, VolumeX } from "lucide-react";

type TodoSoundToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export default function TodoSoundToggle({
  enabled,
  onChange,
}: TodoSoundToggleProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-1.5">
      {enabled ? (
        <Volume2 className="h-3.5 w-3.5 text-app-muted" aria-hidden="true" />
      ) : (
        <VolumeX className="h-3.5 w-3.5 text-app-muted" aria-hidden="true" />
      )}
      <span className="text-[12px] text-app-muted">Taak-geluiden</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Taak-geluiden"
        onClick={() => onChange(!enabled)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
          enabled ? "bg-app-accent" : "bg-app-surface-hover"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            enabled ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
