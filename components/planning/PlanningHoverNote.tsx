"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type PlanningNoteSection = {
  key: string;
  label?: string;
  note: string;
  onSave?: (note: string) => Promise<void>;
};

type PlanningHoverNoteProps = {
  title: string;
  canEdit: boolean;
  sections: PlanningNoteSection[];
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  placement?: "above" | "below";
};

const POPOVER_WIDTH = 224;

export default function PlanningHoverNote({
  title,
  canEdit,
  sections,
  children,
  className = "",
  style,
  placement = "below",
}: PlanningHoverNoteProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const hasContent = sections.some((section) => section.note.trim());
  const showPopover = canEdit || hasContent;

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.min(
        rect.left + rect.width / 2 - POPOVER_WIDTH / 2,
        window.innerWidth - POPOVER_WIDTH - 8,
      ),
    );

    if (placement === "below") {
      setPosition({ top: rect.bottom + 6, left });
      return;
    }

    setPosition({ top: rect.top - 6, left });
  }, [placement]);

  const handleOpen = useCallback(() => {
    if (!showPopover) return;

    setDrafts(
      Object.fromEntries(sections.map((section) => [section.key, section.note])),
    );
    updatePosition();
    setOpen(true);
  }, [sections, showPopover, updatePosition]);

  const handleClose = useCallback((event: React.MouseEvent) => {
    const related = event.relatedTarget as Node | null;
    if (
      related &&
      (anchorRef.current?.contains(related) || popoverRef.current?.contains(related))
    ) {
      return;
    }

    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    function reposition() {
      updatePosition();
    }

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, updatePosition]);

  async function handleSave(section: PlanningNoteSection) {
    if (!section.onSave) return;

    const draft = drafts[section.key] ?? section.note;
    setSavingKey(section.key);
    await section.onSave(draft);
    setSavingKey(null);
  }

  const popover =
    open && showPopover ? (
      <div
        ref={popoverRef}
        className="fixed z-[9999] w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
        style={{
          left: position.left,
          top: placement === "below" ? position.top : undefined,
          bottom:
            placement === "above"
              ? Math.max(8, window.innerHeight - position.top)
              : undefined,
        }}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        <p className="text-[10px] font-bold uppercase text-gray-500">{title}</p>

        <div className="mt-2 space-y-3">
          {sections.map((section) => {
            const draft = drafts[section.key] ?? section.note;

            return (
              <div key={section.key}>
                {section.label ? (
                  <p className="mb-1 text-[10px] font-semibold text-gray-600">
                    {section.label}
                  </p>
                ) : null}

                {canEdit && section.onSave ? (
                  <>
                    <textarea
                      value={draft}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [section.key]: event.target.value,
                        }))
                      }
                      onBlur={() => void handleSave(section)}
                      rows={3}
                      placeholder="Notitie..."
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <button
                      type="button"
                      disabled={savingKey === section.key}
                      onClick={() => void handleSave(section)}
                      className="mt-1 rounded-md bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {savingKey === section.key ? "..." : "Opslaan"}
                    </button>
                  </>
                ) : draft.trim() ? (
                  <p className="whitespace-pre-wrap text-xs text-gray-800">{draft}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <>
      <div
        ref={anchorRef}
        className={`relative ${className}`}
        style={style}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        {children}
      </div>

      {typeof document !== "undefined" && popover
        ? createPortal(popover, document.body)
        : null}
    </>
  );
}
