"use client";

import { forwardRef, useMemo, useRef, useState } from "react";
import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";
import type { BlockProgressionSnapshot } from "@/lib/programWeek/progressionView";
import { useProgramWeekProgressionSnapshot } from "@/app/programs/[id]/weeks/[weekId]/_hooks/useProgramWeekProgressionSnapshot";
import CoachProgramProgressionPanel, {
  type CoachProgramProgressionPanelHandle,
} from "@/components/programs/coach/CoachProgramProgressionPanel";

type CoachProgramProgressionViewProps = {
  block: ProgramBlock | null;
  athleteName?: string;
  athleteId?: string | null;
  snapshot: BlockProgressionSnapshot | null;
  loading: boolean;
  availableBlocks?: ProgramBlock[];
  weeksByBlock?: Record<string, ProgramWeek[]>;
  onSaveCell: (
    exerciseId: string,
    updates: { load: string; reps: string; rpe: string },
  ) => void | Promise<void>;
};

const CoachProgramProgressionView = forwardRef<
  CoachProgramProgressionPanelHandle,
  CoachProgramProgressionViewProps
>(function CoachProgramProgressionView(
  {
    block,
    athleteName,
    athleteId,
    snapshot,
    loading,
    availableBlocks = [],
    weeksByBlock = {},
    onSaveCell,
  },
  ref,
) {
  const primaryPanelRef = useRef<CoachProgramProgressionPanelHandle>(null);
  const [activePanelId, setActivePanelId] = useState<"primary" | "compare">(
    "primary",
  );
  const [compareBlockId, setCompareBlockId] = useState<string>("");

  const compareBlock = useMemo(
    () => availableBlocks.find((item) => item.id === compareBlockId) ?? null,
    [availableBlocks, compareBlockId],
  );

  const compareWeeks = useMemo(
    () => (compareBlockId ? weeksByBlock[compareBlockId] || [] : []),
    [compareBlockId, weeksByBlock],
  );

  const compareProgression = useProgramWeekProgressionSnapshot(
    Boolean(compareBlockId),
    compareWeeks,
    athleteId || block?.athlete_id || compareBlock?.athlete_id || null,
  );

  const otherBlocks = useMemo(
    () => availableBlocks.filter((item) => item.id !== block?.id),
    [availableBlocks, block?.id],
  );

  const isCompareOpen = Boolean(compareBlockId && compareBlock);

  return (
    <div
      className={`coach-program-progression-shell min-w-0 ${
        isCompareOpen ? "is-compare-open" : ""
      }`}
    >
      <div className="coach-program-progression-compare-bar">
        <label className="coach-program-progression-compare-label">
          <span>Vergelijk met block</span>
          <select
            value={compareBlockId}
            onChange={(event) => {
              const next = event.target.value;
              setCompareBlockId(next);
              if (next) {
                setActivePanelId("compare");
              } else {
                setActivePanelId("primary");
              }
            }}
            className="coach-program-progression-compare-select"
          >
            <option value="">Geen vergelijking</option>
            {otherBlocks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title || "Block"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className={`coach-program-progression-split ${
          isCompareOpen ? "is-compare" : ""
        }`}
      >
        <CoachProgramProgressionPanel
          ref={(node) => {
            primaryPanelRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          panelId="primary"
          block={block}
          athleteName={athleteName}
          snapshot={snapshot}
          loading={loading}
          showHint={!isCompareOpen}
          isActive={activePanelId === "primary"}
          onActivate={() => setActivePanelId("primary")}
          onSaveCell={onSaveCell}
        />

        {isCompareOpen && compareBlock ? (
          <CoachProgramProgressionPanel
            panelId="compare"
            block={compareBlock}
            athleteName={athleteName}
            snapshot={compareProgression.snapshot}
            loading={compareProgression.loading}
            showHint={false}
            readOnly
            isActive={activePanelId === "compare"}
            onActivate={() => setActivePanelId("compare")}
            headerActions={
              <button
                type="button"
                onClick={() => {
                  setCompareBlockId("");
                  setActivePanelId("primary");
                }}
                className="coach-program-progression-close-compare"
              >
                Sluiten
              </button>
            }
          />
        ) : null}
      </div>
    </div>
  );
});

export default CoachProgramProgressionView;
