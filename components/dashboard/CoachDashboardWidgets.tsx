"use client";

import { useEffect, useMemo, useState } from "react";
import WidgetPickerModal from "@/components/dashboard/WidgetPickerModal";
import {
  availableWidgetsToAdd,
  COACH_WIDGET_CATALOG,
  loadCoachWidgetLayout,
  saveCoachWidgetLayout,
  widgetWidthClass,
  type CoachWidgetId,
  type CoachWidgetLayoutItem,
  type CoachWidgetWidth,
} from "@/lib/dashboardWidgetOrder";

type CoachDashboardWidgetsProps = {
  editing: boolean;
  widgets: Partial<Record<CoachWidgetId, React.ReactNode>>;
};

const WIDTH_OPTIONS: { value: CoachWidgetWidth; label: string }[] = [
  { value: "full", label: "Vol" },
  { value: "half", label: "½" },
  { value: "third", label: "⅓" },
];

export default function CoachDashboardWidgets({
  editing,
  widgets,
}: CoachDashboardWidgetsProps) {
  const [layout, setLayout] = useState<CoachWidgetLayoutItem[]>([]);
  const [dragId, setDragId] = useState<CoachWidgetId | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setLayout(loadCoachWidgetLayout());
  }, []);

  const usedIds = useMemo(
    () => new Set(layout.map((item) => item.id)),
    [layout],
  );
  const addableCount = availableWidgetsToAdd(layout).length;

  function persist(next: CoachWidgetLayoutItem[]) {
    setLayout(next);
    saveCoachWidgetLayout(next);
  }

  function handleDrop(targetId: CoachWidgetId) {
    if (!editing || !dragId || dragId === targetId) return;

    const next = [...layout];
    const from = next.findIndex((item) => item.id === dragId);
    const to = next.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;

    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persist(next);
    setDragId(null);
  }

  function setWidth(id: CoachWidgetId, width: CoachWidgetWidth) {
    persist(
      layout.map((item) => (item.id === id ? { ...item, width } : item)),
    );
  }

  function removeWidget(id: CoachWidgetId) {
    persist(layout.filter((item) => item.id !== id));
  }

  function addWidget(id: CoachWidgetId) {
    persist([...layout, { id, width: "half" }]);
  }

  return (
    <div className="space-y-4">
      {editing && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-brand-purple/40 bg-brand-purple/5 px-4 py-3">
          <p className="text-sm text-app-muted">
            Sleep widgets, kies breedte, voeg toe of verwijder.
          </p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={addableCount === 0}
            className="app-btn-primary disabled:opacity-50"
          >
            + Widget
          </button>
        </div>
      )}

      <WidgetPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        usedIds={usedIds}
        onSelect={addWidget}
      />

      <div className="grid grid-cols-12 gap-4">
        {layout.map(({ id, width }) => {
          const content = widgets[id];
          if (!content) return null;

          return (
            <div
              key={id}
              draggable={editing}
              onDragStart={() => editing && setDragId(id)}
              onDragOver={(e) => editing && e.preventDefault()}
              onDrop={() => handleDrop(id)}
              className={`col-span-12 ${widgetWidthClass(width)} ${
                editing
                  ? "cursor-grab rounded-2xl border border-dashed border-app-border p-1 active:cursor-grabbing"
                  : ""
              }`}
            >
              {editing && (
                <div className="mb-1 flex flex-wrap items-center gap-2 px-1">
                  <span className="text-xs font-semibold text-app-muted">
                    {COACH_WIDGET_CATALOG[id].icon}{" "}
                    {COACH_WIDGET_CATALOG[id].label}
                  </span>
                  <div className="flex gap-1">
                    {WIDTH_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setWidth(id, option.value)}
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          width === option.value
                            ? "bg-brand-purple text-white"
                            : "bg-app-surface-muted text-app-muted"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWidget(id)}
                    className="ml-auto text-[10px] font-semibold text-red-500"
                  >
                    Verwijder
                  </button>
                </div>
              )}
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
