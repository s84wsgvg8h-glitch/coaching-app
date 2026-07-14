"use client";

import { useRef } from "react";
import {
  ApplyTemplateModalLazy,
  BlockIntakeWizardModalLazy,
  ExerciseLibraryPickerModalLazy,
  ExerciseLibraryVideoModalLazy,
  ProgramPlanningCalendarLazy,
} from "@/components/programs/week/WeekPageLazyPanels";
import ProgramBlockEditModal from "@/components/programs/ProgramBlockEditModal";
import ProgramWeekEditModal from "@/components/programs/ProgramWeekEditModal";
import { isCoachLikeRole } from "@/lib/authRoles";
import type { BlockIntakeWizard } from "@/lib/blockIntakeWizard";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import type { ProgramMacrocycle } from "@/lib/programMacrocycles";
import type { ProgramBlock, ProgramExercise, ProgramWeek } from "@/lib/programWeek/types";

export type ProgramWeekOverlaysProps = {
  offlineQueueCount: number;
  templateApplyOpen: boolean;
  onCloseTemplateApply: () => void;
  userId: string;
  planningAthleteId: string;
  blockId: string;
  onTemplateApplied: (nextBlockId: string, nextWeekId: string) => void;
  editingBlockId: string;
  editingBlockTitle: string;
  editingBlockStartDate: string;
  editingBlockMacrocycleId: string;
  navMacrocycles: ProgramMacrocycle[];
  onCloseBlockEdit: () => void;
  onSaveBlockEdit: (payload: {
    title: string;
    startDate: string;
    macrocycleId: string;
    note: string;
  }) => void | Promise<void>;
  editingWeekId: string;
  editingWeekTitle: string;
  onCloseWeekEdit: () => void;
  onSaveWeekEdit: (payload: { title: string; note: string }) => void | Promise<void>;
  linkingExercise: ProgramExercise | null;
  libraryItems: ExerciseLibraryItem[];
  onCloseLinkingExercise: () => void;
  onSelectLibraryItem: (item: ExerciseLibraryItem) => void;
  previewLibraryItem: ExerciseLibraryItem | null;
  onClosePreviewLibraryItem: () => void;
  blockIntakeWizard: BlockIntakeWizard | null;
  onCloseBlockIntakeWizard: () => void;
  onCompleteBlockIntakeWizard: () => void;
  planningSplitOpen: boolean;
  role: string;
  embeddedInChat: boolean;
  planningPanelHeight: number;
  onPlanningPanelHeightChange: (height: number) => void;
  onClosePlanningSplit: () => void;
  athleteDisplayName: string;
};

export default function ProgramWeekOverlays({
  offlineQueueCount,
  templateApplyOpen,
  onCloseTemplateApply,
  userId,
  planningAthleteId,
  blockId,
  onTemplateApplied,
  editingBlockId,
  editingBlockTitle,
  editingBlockStartDate,
  editingBlockMacrocycleId,
  navMacrocycles,
  onCloseBlockEdit,
  onSaveBlockEdit,
  editingWeekId,
  editingWeekTitle,
  onCloseWeekEdit,
  onSaveWeekEdit,
  linkingExercise,
  libraryItems,
  onCloseLinkingExercise,
  onSelectLibraryItem,
  previewLibraryItem,
  onClosePreviewLibraryItem,
  blockIntakeWizard,
  onCloseBlockIntakeWizard,
  onCompleteBlockIntakeWizard,
  planningSplitOpen,
  role,
  embeddedInChat,
  planningPanelHeight,
  onPlanningPanelHeightChange,
  onClosePlanningSplit,
  athleteDisplayName,
}: ProgramWeekOverlaysProps) {
  const planningResizeRef = useRef<{ startY: number; startHeight: number } | null>(
    null,
  );

  return (
    <>
      <ExerciseLibraryPickerModalLazy
        open={Boolean(linkingExercise)}
        items={libraryItems}
        exerciseName={linkingExercise?.name}
        onClose={onCloseLinkingExercise}
        onSelect={(item) => {
          onSelectLibraryItem(item);
          onCloseLinkingExercise();
        }}
      />

      <ExerciseLibraryVideoModalLazy
        item={previewLibraryItem}
        onClose={onClosePreviewLibraryItem}
      />

      {blockIntakeWizard ? (
        <BlockIntakeWizardModalLazy
          wizard={blockIntakeWizard}
          onClose={onCloseBlockIntakeWizard}
          onCompleted={onCompleteBlockIntakeWizard}
        />
      ) : null}

      {planningSplitOpen &&
      isCoachLikeRole(role) &&
      !embeddedInChat &&
      planningAthleteId ? (
        <div
          className="hidden shrink-0 flex-col overflow-hidden border-t border-app-border bg-app-surface lg:flex"
          style={{ height: planningPanelHeight }}
        >
          <div
            role="separator"
            aria-label="Planninghoogte aanpassen"
            className="flex h-3 shrink-0 cursor-row-resize items-center justify-center border-b border-app-border bg-app-surface touch-none"
            onPointerDown={(event) => {
              planningResizeRef.current = {
                startY: event.clientY,
                startHeight: planningPanelHeight,
              };
              event.currentTarget.setPointerCapture(event.pointerId);

              function onMove(moveEvent: PointerEvent) {
                if (!planningResizeRef.current) return;
                const delta =
                  moveEvent.clientY - planningResizeRef.current.startY;
                const nextHeight = Math.min(
                  Math.max(180, planningResizeRef.current.startHeight - delta),
                  window.innerHeight * 0.75,
                );
                onPlanningPanelHeightChange(nextHeight);
              }

              function onUp() {
                planningResizeRef.current = null;
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
              }

              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}
          >
            <div className="h-1 w-12 rounded-full bg-gray-300" />
          </div>
          <div className="flex items-center justify-between border-b border-app-border bg-app-surface px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-app-text">Block & week planning</h2>
              <p className="text-xs text-gray-500">
                Sleep de rand omhoog of omlaag om de hoogte aan te passen.
              </p>
            </div>
            <button
              type="button"
              onClick={onClosePlanningSplit}
              className="rounded-xl border border-app-border px-3 py-1.5 text-xs font-semibold text-app-muted hover:bg-app-surface-hover"
            >
              Sluiten
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ProgramPlanningCalendarLazy
              athleteId={planningAthleteId}
              athleteName={athleteDisplayName}
              canEditNotes={isCoachLikeRole(role)}
              coachId={isCoachLikeRole(role) ? userId : undefined}
            />
          </div>
        </div>
      ) : null}

      {offlineQueueCount > 0 ? (
        <div className="fixed left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-[899] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 lg:left-auto lg:right-4 lg:max-w-sm">
          {offlineQueueCount} set(s) wachten op sync — wordt automatisch opgeslagen zodra je
          weer online bent.
        </div>
      ) : null}

      <ApplyTemplateModalLazy
        open={templateApplyOpen}
        onClose={onCloseTemplateApply}
        coachId={userId}
        athleteId={planningAthleteId}
        actingUserId={userId}
        targetBlockId={blockId}
        onApplied={({ blockId: nextBlockId, weekId: nextWeekId }) => {
          if (nextWeekId) {
            onTemplateApplied(nextBlockId, nextWeekId);
          }
        }}
      />

      <ProgramBlockEditModal
        open={Boolean(editingBlockId)}
        title={editingBlockTitle}
        startDate={editingBlockStartDate}
        macrocycleId={editingBlockMacrocycleId}
        macrocycles={navMacrocycles}
        blockId={editingBlockId}
        athleteId={planningAthleteId}
        coachId={userId}
        onClose={onCloseBlockEdit}
        onSave={onSaveBlockEdit}
      />

      <ProgramWeekEditModal
        open={Boolean(editingWeekId)}
        title={editingWeekTitle}
        weekId={editingWeekId}
        athleteId={planningAthleteId}
        coachId={userId}
        onClose={onCloseWeekEdit}
        onSave={onSaveWeekEdit}
      />
    </>
  );
}
