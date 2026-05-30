"use client";

import {
  COACH_WIDGET_CATALOG,
  type CoachWidgetId,
} from "@/lib/dashboardWidgetOrder";

type WidgetPickerModalProps = {
  open: boolean;
  onClose: () => void;
  usedIds: Set<CoachWidgetId>;
  onSelect: (id: CoachWidgetId) => void;
};

export default function WidgetPickerModal({
  open,
  onClose,
  usedIds,
  onSelect,
}: WidgetPickerModalProps) {
  if (!open) return null;

  const allIds = Object.keys(COACH_WIDGET_CATALOG) as CoachWidgetId[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-app-border bg-app-surface p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-app-text">Widget toevoegen</h2>
            <p className="text-sm text-app-muted">
              Kies een widget voor je dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-semibold text-app-muted hover:bg-app-surface-muted"
          >
            Sluiten
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {allIds.map((id) => {
            const meta = COACH_WIDGET_CATALOG[id];
            const used = usedIds.has(id);

            return (
              <button
                key={id}
                type="button"
                disabled={used}
                onClick={() => {
                  onSelect(id);
                  onClose();
                }}
                className={`rounded-xl border p-4 text-left transition app-focus-ring ${
                  used
                    ? "cursor-not-allowed border-app-border bg-app-surface-muted opacity-50"
                    : "border-app-border hover:border-brand-purple hover:bg-brand-purple/5"
                }`}
              >
                <span className="text-2xl">{meta.icon}</span>
                <p className="mt-2 font-semibold text-app-text">{meta.label}</p>
                <p className="mt-1 text-xs text-app-muted">{meta.description}</p>
                {used && (
                  <p className="mt-2 text-[10px] font-bold uppercase text-app-muted">
                    Al toegevoegd
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
