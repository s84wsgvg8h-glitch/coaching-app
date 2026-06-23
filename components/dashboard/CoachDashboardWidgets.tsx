"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical } from "lucide-react";
import WidgetPickerModal from "@/components/dashboard/WidgetPickerModal";
import {
  availableWidgetsToAdd,
  COACH_WIDGET_CATALOG,
  DEFAULT_COACH_WIDGET_LAYOUT,
  FIXED_WIDTH_WIDGETS,
  loadCoachWidgetLayout,
  widgetGridClass,
  type CoachWidgetId,
  type CoachWidgetLayoutItem,
  type CoachWidgetWidth,
} from "@/lib/dashboardWidgetOrder";
import {
  loadCoachWidgetLayoutAsync,
  saveCoachWidgetLayoutAsync,
} from "@/lib/coachDashboardLayout";

type CoachDashboardWidgetsProps = {
  editing: boolean;
  widgets: Partial<Record<CoachWidgetId, React.ReactNode>>;
  coachId?: string;
};

type DragGhost = {
  id: CoachWidgetId;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

const WIDTH_OPTIONS: { value: CoachWidgetWidth; label: string }[] = [
  { value: "full", label: "Vol" },
  { value: "half", label: "½" },
  { value: "third", label: "⅓" },
];

function isInteractiveDragTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "button, a, input, textarea, select, label, [contenteditable='true']",
    ),
  );
}

export default function CoachDashboardWidgets({
  editing,
  widgets,
  coachId,
}: CoachDashboardWidgetsProps) {
  const [layout, setLayout] = useState<CoachWidgetLayoutItem[]>(() =>
    typeof window === "undefined" ? DEFAULT_COACH_WIDGET_LAYOUT : loadCoachWidgetLayout(),
  );
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const [dragOverId, setDragOverId] = useState<CoachWidgetId | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const widgetRefs = useRef<Map<CoachWidgetId, HTMLDivElement>>(new Map());
  const layoutRef = useRef(layout);
  const dragGhostRef = useRef<DragGhost | null>(null);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    dragGhostRef.current = dragGhost;
  }, [dragGhost]);

  useEffect(() => {
    if (!coachId) return;

    void loadCoachWidgetLayoutAsync(coachId).then(setLayout);
  }, [coachId]);

  const usedIds = useMemo(
    () => new Set(layout.map((item) => item.id)),
    [layout],
  );
  const addableCount = availableWidgetsToAdd(layout).length;

  const displayLayout = useMemo(() => {
    if (!dragGhost || !dragOverId || dragGhost.id === dragOverId) return layout;

    const next = [...layout];
    const from = next.findIndex((item) => item.id === dragGhost.id);
    const to = next.findIndex((item) => item.id === dragOverId);
    if (from < 0 || to < 0) return layout;

    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }, [dragGhost, dragOverId, layout]);

  function persist(next: CoachWidgetLayoutItem[]) {
    setLayout(next);
    if (coachId) {
      void saveCoachWidgetLayoutAsync(coachId, next);
    } else {
      void import("@/lib/dashboardWidgetOrder").then(({ saveCoachWidgetLayout }) =>
        saveCoachWidgetLayout(next),
      );
    }
  }

  function findDropTarget(clientX: number, clientY: number) {
    for (const { id } of layoutRef.current) {
      const node = widgetRefs.current.get(id);
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return id;
      }
    }
    return null;
  }

  function finishDrag(clientX: number, clientY: number) {
    const ghost = dragGhostRef.current;
    if (!ghost) return;

    const targetId = findDropTarget(clientX, clientY);
    if (targetId && targetId !== ghost.id) {
      const next = [...layoutRef.current];
      const from = next.findIndex((item) => item.id === ghost.id);
      const to = next.findIndex((item) => item.id === targetId);
      if (from >= 0 && to >= 0) {
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        persist(next);
      }
    }

    dragGhostRef.current = null;
    setDragGhost(null);
    setDragOverId(null);
  }

  function startDrag(
    id: CoachWidgetId,
    event: React.PointerEvent<HTMLElement>,
  ) {
    if (!editing || isInteractiveDragTarget(event.target)) return;

    const node = widgetRefs.current.get(id);
    if (!node) return;

    const rect = node.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);

    const ghost: DragGhost = {
      id,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    dragGhostRef.current = ghost;
    setDragGhost(ghost);
    setDragOverId(id);

    function onPointerMove(moveEvent: PointerEvent) {
      const current = dragGhostRef.current;
      if (!current) return;

      setDragGhost({
        ...current,
        x: moveEvent.clientX - current.offsetX,
        y: moveEvent.clientY - current.offsetY,
      });

      const targetId = findDropTarget(moveEvent.clientX, moveEvent.clientY);
      setDragOverId(targetId && targetId !== current.id ? targetId : null);
    }

    function onPointerUp(upEvent: PointerEvent) {
      finishDrag(upEvent.clientX, upEvent.clientY);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
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
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-app-border px-4 py-3">
          <p className="text-[13px] font-normal text-app-muted">
            Houd een widget vast om te verplaatsen.
          </p>
          <button
            type="button"
            onClick={() => persist([...DEFAULT_COACH_WIDGET_LAYOUT])}
            className="app-btn-secondary"
          >
            Standaard layout
          </button>
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

      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {displayLayout.map(({ id, width }) => {
          const content = widgets[id];
          if (!content) return null;

          const isDragging = dragGhost?.id === id;
          const isDragTarget = editing && dragOverId === id && dragGhost?.id !== id;

          return (
            <div
              key={id}
              ref={(node) => {
                if (node) widgetRefs.current.set(id, node);
                else widgetRefs.current.delete(id);
              }}
              data-coach-widget={id}
              onPointerDown={(event) => {
                if (!editing) return;
                if (isInteractiveDragTarget(event.target)) return;
                startDrag(id, event);
              }}
              className={`transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${widgetGridClass(id, width)} ${
                editing
                  ? `rounded-[16px] border border-dashed p-1 ${
                      isDragTarget
                        ? "border-app-accent bg-app-accent/5 ring-2 ring-app-accent/30 scale-[1.01]"
                        : "border-app-border cursor-grab active:cursor-grabbing"
                    } ${isDragging ? "scale-[0.97] opacity-35" : ""}`
                  : ""
              }`}
            >
              {editing && (
                <div className="mb-1 flex flex-wrap items-center gap-2 px-1">
                  <span className="inline-flex items-center gap-1 rounded-[16px] px-1 py-0.5 text-xs font-semibold text-app-muted">
                    <GripVertical className="h-3.5 w-3.5" />
                    {COACH_WIDGET_CATALOG[id].icon}{" "}
                    {COACH_WIDGET_CATALOG[id].label}
                  </span>
                  {!FIXED_WIDTH_WIDGETS.has(id) ? (
                  <div className="flex gap-1">
                    {WIDTH_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setWidth(id, option.value)}
                        className={`rounded-[16px] px-2 py-0.5 text-[10px] font-bold ${
                          width === option.value
                            ? "bg-brand-purple text-white"
                            : "bg-app-surface-muted text-app-muted"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  ) : null}
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

      {dragGhost && typeof document !== "undefined"
        ? createPortal(
            <div
              className="dashboard-widget-ghost pointer-events-none fixed z-[120] overflow-hidden rounded-[16px] border border-app-accent/40 bg-app-surface/95 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-transform duration-150 ease-out"
              style={{
                left: dragGhost.x,
                top: dragGhost.y,
                width: dragGhost.width,
                height: dragGhost.height,
                transform: "rotate(-1.5deg) scale(1.02)",
              }}
            >
              <div className="flex items-center gap-2 border-b border-app-border/60 px-3 py-2 text-xs font-semibold text-app-text">
                <GripVertical className="h-3.5 w-3.5 text-app-accent" />
                {COACH_WIDGET_CATALOG[dragGhost.id].icon}{" "}
                {COACH_WIDGET_CATALOG[dragGhost.id].label}
              </div>
              <div className="h-[calc(100%-36px)] bg-app-accent/5" />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
