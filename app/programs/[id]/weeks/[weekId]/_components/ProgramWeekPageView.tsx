"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { RawProgramEditorHandle } from "@/components/programs/coach/RawProgramEditor";
import type { CoachProgramProgressionPanelHandle } from "@/components/programs/coach/CoachProgramProgressionPanel";
import AthleteProgramWeekContent from "@/components/programs/athlete/AthleteProgramWeekContent";
import AthleteExerciseFillPanel from "@/components/programs/athlete/AthleteExerciseFillPanel";
import AppSidebar from "@/components/AppSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import CoachMobileBottomNav from "@/components/coach/CoachMobileBottomNav";
import DemoModeBanner from "@/components/DemoModeBanner";
import MobilePullToRefreshInner from "@/components/mobile/MobilePullToRefreshInner";
import ProgramWeekSkeleton from "@/components/programs/ProgramWeekSkeleton";
import ProgramAthleteVideoRecorder from "@/components/programs/week/ProgramAthleteVideoRecorder";
import ProgramWeekOverlays from "@/components/programs/week/ProgramWeekOverlays";
import { isCoachLikeRole } from "@/lib/authRoles";
import { isDayPast, hasIncompleteSetField } from "@/lib/programDayValidation";
import { isAthleteExtraExercise } from "@/lib/athleteExtraExercise";
import { isAthleteChoiceExercise } from "@/lib/athleteExerciseVariation";
import { normalizeExerciseName } from "@/lib/programWeek/exerciseUtils";
import { useMobilePullToRefresh } from "@/hooks/useMobilePullToRefresh";
import type { ProgramWeekPageViewProps } from "./programWeekPageViewProps";

const AthleteProgramSidebar = dynamic(
  () => import("@/components/programs/athlete/AthleteProgramSidebar"),
  { ssr: false },
);

const CoachProgramWeekContent = dynamic(
  () => import("@/components/programs/coach/CoachProgramWeekContent"),
  { loading: () => <ProgramWeekSkeleton /> },
);

const CoachProgramWeekHeader = dynamic(
  () => import("@/components/programs/coach/CoachProgramWeekHeader"),
  { loading: () => null },
);

const CoachProgramWeekStatsFooter = dynamic(
  () =>
    import("@/components/programs/coach/CoachProgramWeekHeader").then(
      (mod) => mod.CoachProgramWeekStatsFooter,
    ),
  { loading: () => null },
);

const RawProgramEditor = dynamic(
  () => import("@/components/programs/coach/RawProgramEditor"),
  { loading: () => <ProgramWeekSkeleton /> },
);

const CoachProgramProgressionView = dynamic(
  () => import("@/components/programs/coach/CoachProgramProgressionView"),
  { loading: () => <ProgramWeekSkeleton /> },
);

const CoachProgramRawWeekTabs = dynamic(
  () => import("@/components/programs/coach/CoachProgramRawWeekTabs"),
  { ssr: false },
);

export default function ProgramWeekPageView(props: ProgramWeekPageViewProps) {
  const {
    embeddedInChat,
    isAthleteView,
    isCoachView,
    athleteSidebarBlocks,
    sidebarCompetitions,
    sidebarAthleteId,
    setOpenBlockIds,
    goToProgram,
    blocksSidebar,
    role,
    planningSplitOpen,
    isPending,
    navigatingUrl,
    programReady,
    authLoading,
    currentBlock,
    week,
    days,
    exercisesByDay,
    userId,
    athleteCoachId,
    openAthleteDayNotesId,
    selectedAthleteExerciseId,
    athleteExercisePanelOpen,
    getAthleteDayCheckin,
    getDayDate,
    getDayDateObject,
    updateAthleteDayCheckinLocal,
    saveAthleteDayCheckin,
    setOpenAthleteDayNotesId,
    getSetRowsForExercise,
    getExerciseLibraryItem,
    getAthleteSetAverage,
    getDisplayIntensity,
    getExercisePriority,
    getExercisePriorityLabel,
    openAthleteExercisePanel,
    setPreviewLibraryItem,
    onAddExtraExercise,
    onDeleteExtraExercise,
    onRenameExtraExercise,
    onChooseExerciseVariation,
    onToggleAthleteVariationMode,
    addingExtraExercise,
    deletingExtraExerciseId,
    renamingExtraExerciseId,
    choosingVariationExerciseId,
    blockWeekNav,
    editorView,
    setEditorView,
    registerProgramEditFlush,
    setPlanningSplitOpen,
    athleteId,
    programSearchContext,
    creatingExerciseDayId,
    openDayNoteId,
    openDayWarmupId,
    openExerciseNoteId,
    draggedDayId,
    dayDropIndicator,
    draggedExercise,
    exerciseDropIndicator,
    isCreatingDay,
    newDayTitle,
    newDayInputRef,
    exerciseNameInputRef,
    uitlegMode,
    exerciseName,
    exerciseSets,
    exerciseReps,
    exerciseIntensity,
    exerciseLoadKg,
    setOpenDayWarmupId,
    setOpenDayNoteId,
    setUitlegMode,
    setCreatingExerciseDayId,
    setExerciseName,
    setExerciseSets,
    setExerciseReps,
    setExerciseIntensity,
    setExerciseLoadKg,
    setIsCreatingDay,
    setNewDayTitle,
    setOpenExerciseNoteId,
    getDayDateInputValue,
    hasExercises,
    duplicateDay,
    deleteDay,
    updateDayLocal,
    saveDayMeta,
    saveDayField,
    deleteDayField,
    handleDragStart,
    handleDragOver,
    saveDayOrder,
    saveExerciseLibraryLink,
    handleExerciseDragStart,
    handleExerciseDragOver,
    handleExerciseDragOverDay,
    handleExerciseDragOverDayTail,
    saveExerciseOrder,
    updateExerciseLocal,
    saveExerciseField,
    deleteExercise,
    handleCoachExerciseEnter,
    handleNewExerciseFormKeyDown,
    addExercise,
    updateIntensityType,
    deleteExerciseNote,
    saveExercisePriority,
    saveExerciseFields,
    getAthleteExerciseNote,
    createDay,
    setLinkingExercise,
    getShortSbdWeekSummary,
    weekStatsReport,
    weeksByBlock,
    blockId,
    weekId,
    insertExerciseFromRaw,
    applyRawClipboardPaste,
    duplicateExerciseRow,
    getSelectedAthleteExercise,
    loadingAthleteSets,
    athleteNotePanelOpen,
    previousWeekOpen,
    loadingPreviousWeekSets,
    previousWeekMessage,
    previousWeekData,
    uploadingVideoSetKey,
    setAthleteExercisePanelOpen,
    setSelectedAthleteExerciseId,
    setAthleteNotePanelOpen,
    resetPreviousWeekData,
    updateAthleteExerciseNoteLocal,
    saveAthleteExerciseNote,
    loadPreviousWeekExerciseSets,
    openVideoRecorder,
    updateAthleteSetLocal,
    saveAthleteSetField,
    handleAthleteSetArrowNavigation,
    copyAthleteSetToNextRow,
    deleteAthleteSetVideo,
    getAthleteSetVideo,
    getAthleteSetVideoKey,
    getInlineE1rmLabel,
    getAverageFromRows,
    videoRecorder,
    offlineQueueCount,
    offlineSyncSyncing,
    offlineSyncOnline,
    onRetryOfflineSync,
    onDismissOfflineSync,
    templateApplyOpen,
    setTemplateApplyOpen,
    planningAthleteId,
    editingBlockId,
    editingBlockTitle,
    editingBlockStartDate,
    editingBlockMacrocycleId,
    setEditingBlockId,
    setEditingBlockTitle,
    setEditingBlockStartDate,
    setEditingBlockMacrocycleId,
    navMacrocycles,
    renameBlock,
    editingWeekId,
    editingWeekTitle,
    setEditingWeekId,
    setEditingWeekTitle,
    renameWeek,
    linkingExercise,
    libraryItems,
    previewLibraryItem,
    blockIntakeWizard,
    setBlockIntakeWizard,
    planningPanelHeight,
    setPlanningPanelHeight,
    athleteDisplayName,
    progressionSnapshot,
    progressionLoading,
    progressionBlocks,
    progressionWeeksByBlock,
    onProgressionSaveCell,
    onPullToRefresh,
    coachAthleteOptions,
    currentCoachAthleteId,
    onCoachAthleteChange,
    coachAthleteSwitching,
  } = props;

  const coachHeaderAthleteProps = isCoachView
    ? {
        athleteOptions: coachAthleteOptions,
        currentAthleteId: currentCoachAthleteId,
        onAthleteChange: onCoachAthleteChange,
        athleteSwitching: coachAthleteSwitching,
      }
    : {};

  const coachCompareProps = isCoachView
    ? {
        compareNavBlocks: progressionBlocks,
        compareWeeksByBlock: progressionWeeksByBlock,
        compareBlockId: blockId,
        compareWeekId: weekId,
        compareCurrentBlock: currentBlock,
        compareCurrentWeek: week,
        onCompareOpenWeek: (targetBlockId: string, targetWeekId: string) => {
          void goToProgram(targetBlockId, targetWeekId);
        },
      }
    : {};

  const coachAlternateHeader = !embeddedInChat ? (
    <CoachProgramWeekHeader
      blockTitle={currentBlock?.title || "Block"}
      weekTitle={week?.title || "Week"}
      backHref={athleteId ? `/athletes/${athleteId}` : "/athletes"}
      editorView={editorView}
      onEditorViewChange={setEditorView}
      showEditorViewToggle={isCoachLikeRole(role)}
      showCompareView={isCoachView}
      userId={userId}
      role={role}
      compareCurrentDays={days}
      compareCurrentExercisesByDay={exercisesByDay}
      {...coachHeaderAthleteProps}
      {...coachCompareProps}
    />
  ) : null;

  const athleteWeekPreviewProps = {
    mobileWeekNav: null as ReactNode,
    blockTitle: currentBlock?.title || "Block",
    weekTitle: week?.title || "Week",
    days,
    exercisesByDay,
    userId,
    athleteCoachId,
    openAthleteDayNotesId,
    selectedAthleteExerciseId,
    athleteExercisePanelOpen,
    getAthleteDayCheckin,
    getDayDate,
    isDayPast,
    getDayDateObject,
    updateAthleteDayCheckinLocal,
    saveAthleteDayCheckin,
    setOpenAthleteDayNotesId,
    getSetRowsForExercise,
    hasIncompleteSetField,
    getExerciseLibraryItem,
    getAthleteSetAverage,
    getDisplayIntensity,
    getExercisePriority,
    getExercisePriorityLabel,
    capitalizeExerciseName: normalizeExerciseName,
    openAthleteExercisePanel,
    setPreviewLibraryItem,
  };

  const rawEditorRef = useRef<RawProgramEditorHandle>(null);
  const progressionRef = useRef<CoachProgramProgressionPanelHandle>(null);

  useEffect(() => {
    if (!isCoachView) {
      registerProgramEditFlush(null);
      return;
    }

    if (editorView === "raw") {
      registerProgramEditFlush(async () => {
        await rawEditorRef.current?.flushPendingEdits();
      });
      return;
    }

    if (editorView === "progression") {
      registerProgramEditFlush(async () => {
        await progressionRef.current?.flushPendingEdits();
      });
      return;
    }

    registerProgramEditFlush(null);

    return () => {
      registerProgramEditFlush(null);
    };
  }, [editorView, isCoachView, registerProgramEditFlush]);
  const mainScrollRef = useRef<HTMLElement>(null);
  const isCoachRawView =
    isCoachView && editorView === "raw" && !embeddedInChat;

  const ptrEnabled =
    !embeddedInChat &&
    !isCoachRawView &&
    isAthleteView &&
    !athleteExercisePanelOpen;

  const { pullDistance, isRefreshing, contentStyle, threshold } =
    useMobilePullToRefresh({
      scrollRef: mainScrollRef,
      enabled: ptrEnabled,
      onRefresh: onPullToRefresh,
    });

  const navigateToWeek = (targetWeekId: string) => {
    void goToProgram(blockId, targetWeekId);
  };

  const showAthleteExerciseFillPanel =
    athleteExercisePanelOpen &&
    (isAthleteView || (isCoachView && editorView === "athlete"));

  return (
    <div
      className={
        embeddedInChat
          ? "h-full min-h-0 bg-gray-100"
            : isAthleteView
              ? `athlete-program-shell relative flex h-full min-h-0 flex-col lg:h-[100dvh] lg:min-h-0 lg:flex-row lg:overflow-hidden lg:pt-[env(safe-area-inset-top)]${
                  athleteExercisePanelOpen ? " athlete-program-shell--fill-open" : ""
                }`
              : isCoachView
                ? isCoachRawView
                  ? "coach-program-shell coach-program-shell--raw-view relative flex h-[100dvh] min-h-0 flex-col overflow-hidden supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)] lg:flex-row"
                  : `coach-program-shell relative flex h-full min-h-0 flex-col overflow-hidden lg:h-[100dvh] lg:min-h-0 lg:flex-row${
                      editorView === "athlete" && athleteExercisePanelOpen
                        ? " athlete-program-shell--fill-open"
                        : ""
                    }`
                : "relative min-h-[100dvh] bg-gray-100 program-week-shell supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)] lg:flex lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden"
      }
    >
      {!embeddedInChat && !isAthleteView && !isCoachView ? (
        <AppSidebar />
      ) : null}
      {!embeddedInChat && isAthleteView ? (
        <AthleteProgramSidebar
          blocks={athleteSidebarBlocks}
          onToggleBlock={(targetBlockId) =>
            setOpenBlockIds((current) => ({
              ...current,
              [targetBlockId]: !current[targetBlockId],
            }))
          }
          onSelectWeek={(targetBlockId, targetWeekId) =>
            goToProgram(targetBlockId, targetWeekId)
          }
        />
      ) : null}
      {!embeddedInChat && !isAthleteView ? blocksSidebar : null}
      {!embeddedInChat && isAthleteView ? <MobileBottomNav /> : null}
      {!embeddedInChat && isCoachView ? <CoachMobileBottomNav /> : null}

      <main
        ref={mainScrollRef}
        className={
          embeddedInChat
            ? "h-full min-h-0 min-w-0 overflow-y-auto"
            : isCoachRawView
              ? "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              : `relative min-h-0 min-w-0 flex-1 mobile-scroll ${
                  isAthleteView ? "athlete-program-main-scroll " : ""
                }${
                  isCoachView && !isCoachRawView ? "coach-program-main-scroll " : ""
                }${
                planningSplitOpen && isCoachLikeRole(role)
                  ? "lg:flex lg:h-[100dvh] lg:flex-col lg:overflow-hidden"
                  : "overflow-y-auto"
              }`
        }
      >
      <MobilePullToRefreshInner
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        contentStyle={contentStyle}
        threshold={threshold}
        className={
          isCoachRawView
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : undefined
        }
      >
      {!embeddedInChat ? <DemoModeBanner /> : null}
      <div
        className={
          isCoachRawView
            ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            : planningSplitOpen && isCoachLikeRole(role) && !embeddedInChat
              ? "lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
              : ""
        }
      >
      {(isPending || navigatingUrl) && (
        <div className="fixed left-0 right-0 top-[env(safe-area-inset-top,0px)] z-50 h-1 overflow-hidden bg-gray-200">
          <div className="h-full w-1/3 bg-black animate-[loadingbar_0.9s_ease-in-out_infinite]" />
        </div>
      )}
      <section
        className={`min-w-0 transition-opacity duration-200 ${
          embeddedInChat
            ? "p-2 pb-4"
            : isAthleteView || isCoachView
              ? isAthleteView
                ? "athlete-program-content p-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:p-6 lg:pb-6"
                : isCoachRawView
                  ? "coach-program-content coach-program-content--raw-view p-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:p-6 lg:pb-6"
                  : "coach-program-content p-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:p-6 lg:pb-6"
              : "p-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:p-8 lg:pb-8"
        } ${navigatingUrl ? "pointer-events-none opacity-60" : "opacity-100"}`}
      >
          {!programReady ? (
            <ProgramWeekSkeleton />
          ) : isAthleteView ? (
            <AthleteProgramWeekContent
              mobileWeekNav={!embeddedInChat ? blockWeekNav : null}
              blockTitle={currentBlock?.title || "Block"}
              weekTitle={week?.title || "Week"}
              days={days}
              exercisesByDay={exercisesByDay}
              userId={userId}
              athleteCoachId={athleteCoachId}
              openAthleteDayNotesId={openAthleteDayNotesId}
              selectedAthleteExerciseId={selectedAthleteExerciseId}
              athleteExercisePanelOpen={athleteExercisePanelOpen}
              getAthleteDayCheckin={getAthleteDayCheckin}
              getDayDate={getDayDate}
              isDayPast={isDayPast}
              getDayDateObject={getDayDateObject}
              updateAthleteDayCheckinLocal={updateAthleteDayCheckinLocal}
              saveAthleteDayCheckin={saveAthleteDayCheckin}
              setOpenAthleteDayNotesId={setOpenAthleteDayNotesId}
              getSetRowsForExercise={getSetRowsForExercise}
              hasIncompleteSetField={hasIncompleteSetField}
              getExerciseLibraryItem={getExerciseLibraryItem}
              getAthleteSetAverage={getAthleteSetAverage}
              getDisplayIntensity={getDisplayIntensity}
              getExercisePriority={getExercisePriority}
              getExercisePriorityLabel={getExercisePriorityLabel}
              capitalizeExerciseName={normalizeExerciseName}
              openAthleteExercisePanel={openAthleteExercisePanel}
              setPreviewLibraryItem={setPreviewLibraryItem}
              onAddExtraExercise={onAddExtraExercise}
              onDeleteExtraExercise={onDeleteExtraExercise}
              addingExtraExercise={addingExtraExercise}
              deletingExtraExerciseId={deletingExtraExerciseId}
            />
          ) : editorView === "card" ? (
            <CoachProgramWeekContent
              embeddedInChat={embeddedInChat}
              isCoach={isCoachLikeRole(role)}
              mobileWeekNav={!embeddedInChat ? blockWeekNav : null}
              blockTitle={currentBlock?.title || "Block"}
              weekTitle={week?.title || "Week"}
              programSearchContext={programSearchContext}
              planningSplitOpen={planningSplitOpen}
              onTogglePlanning={() => setPlanningSplitOpen((value) => !value)}
              backHref={athleteId ? `/athletes/${athleteId}` : "/athletes"}
              editorView={editorView}
              onEditorViewChange={setEditorView}
              showEditorViewToggle={isCoachLikeRole(role)}
              {...coachHeaderAthleteProps}
              {...coachCompareProps}
              days={days}
              exercisesByDay={exercisesByDay}
              creatingExerciseDayId={creatingExerciseDayId}
              openDayNoteId={openDayNoteId}
              openDayWarmupId={openDayWarmupId}
              openExerciseNoteId={openExerciseNoteId}
              draggedDayId={draggedDayId}
              dayDropIndicator={dayDropIndicator}
              draggedExercise={draggedExercise}
              exerciseDropIndicator={exerciseDropIndicator}
              isCreatingDay={isCreatingDay}
              newDayTitle={newDayTitle}
              newDayInputRef={newDayInputRef}
              exerciseNameInputRef={exerciseNameInputRef}
              uitlegMode={uitlegMode}
              userId={userId}
              role={role}
              exerciseName={exerciseName}
              exerciseSets={exerciseSets}
              exerciseReps={exerciseReps}
              exerciseIntensity={exerciseIntensity}
              exerciseLoadKg={exerciseLoadKg}
              setOpenDayWarmupId={setOpenDayWarmupId}
              setOpenDayNoteId={setOpenDayNoteId}
              setUitlegMode={setUitlegMode}
              setPreviewLibraryItem={setPreviewLibraryItem}
              setCreatingExerciseDayId={setCreatingExerciseDayId}
              setExerciseName={setExerciseName}
              setExerciseSets={setExerciseSets}
              setExerciseReps={setExerciseReps}
              setExerciseIntensity={setExerciseIntensity}
              setExerciseLoadKg={setExerciseLoadKg}
              setIsCreatingDay={setIsCreatingDay}
              setNewDayTitle={setNewDayTitle}
              setOpenExerciseNoteId={setOpenExerciseNoteId}
              getDayDate={getDayDate}
              getDayDateInputValue={getDayDateInputValue}
              hasExercises={hasExercises}
              duplicateDay={duplicateDay}
              deleteDay={deleteDay}
              updateDayLocal={updateDayLocal}
              saveDayMeta={saveDayMeta}
              saveDayField={saveDayField}
              deleteDayField={deleteDayField}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              saveDayOrder={saveDayOrder}
              getExerciseLibraryItem={getExerciseLibraryItem}
              saveExerciseLibraryLink={saveExerciseLibraryLink}
              handleExerciseDragStart={handleExerciseDragStart}
              handleExerciseDragOver={handleExerciseDragOver}
              handleExerciseDragOverDay={handleExerciseDragOverDay}
              handleExerciseDragOverDayTail={handleExerciseDragOverDayTail}
              saveExerciseOrder={saveExerciseOrder}
              updateExerciseLocal={updateExerciseLocal}
              saveExerciseField={saveExerciseField}
              deleteExercise={deleteExercise}
              handleCoachExerciseEnter={handleCoachExerciseEnter}
              handleNewExerciseFormKeyDown={handleNewExerciseFormKeyDown}
              addExercise={addExercise}
              updateIntensityType={updateIntensityType}
              deleteExerciseNote={deleteExerciseNote}
              saveExercisePriority={saveExercisePriority}
              saveExerciseFields={saveExerciseFields}
              getAthleteExerciseNote={getAthleteExerciseNote}
              createDay={createDay}
              onLinkExerciseForLibrary={setLinkingExercise}
              sbdWeekSummary={getShortSbdWeekSummary()}
              weekStatsReport={weekStatsReport}
              onToggleAthleteVariationMode={onToggleAthleteVariationMode}
            />
          ) : (
            <div
              className={`coach-program-main max-w-full${
                editorView === "raw" ? " coach-program-main--raw" : ""
              }`}
            >
              {!embeddedInChat && editorView !== "raw" ? blockWeekNav : null}
              {coachAlternateHeader}
              {!embeddedInChat && editorView === "raw" ? (
                <CoachProgramRawWeekTabs
                  weeks={weeksByBlock[blockId] || []}
                  currentWeekId={weekId}
                  onSelectWeek={navigateToWeek}
                />
              ) : null}

              {editorView === "raw" ? (
                <RawProgramEditor
                  ref={rawEditorRef}
                  days={days}
                  exercisesByDay={exercisesByDay}
                  getDayDate={getDayDate}
                  blockWeeks={weeksByBlock[blockId] || []}
                  currentWeekId={weekId}
                  onSelectWeek={navigateToWeek}
                  updateExerciseLocal={updateExerciseLocal}
                  saveExerciseField={saveExerciseField}
                  saveExerciseFields={saveExerciseFields}
                  saveExercisePriority={saveExercisePriority}
                  deleteExercise={deleteExercise}
                  duplicateDay={duplicateDay}
                  insertExerciseFromRaw={insertExerciseFromRaw}
                  applyRawClipboardPaste={applyRawClipboardPaste}
                  duplicateExerciseRow={duplicateExerciseRow}
                  onToggleAthleteVariationMode={onToggleAthleteVariationMode}
                />
              ) : null}

              {editorView === "progression" ? (
                <CoachProgramProgressionView
                  ref={progressionRef}
                  block={currentBlock}
                  athleteName={athleteDisplayName}
                  athleteId={planningAthleteId}
                  snapshot={progressionSnapshot}
                  loading={progressionLoading}
                  availableBlocks={progressionBlocks}
                  weeksByBlock={progressionWeeksByBlock}
                  onSaveCell={onProgressionSaveCell}
                />
              ) : null}

              {editorView === "athlete" ? (
                <AthleteProgramWeekContent {...athleteWeekPreviewProps} />
              ) : null}

              {!embeddedInChat ? (
                <CoachProgramWeekStatsFooter
                  weekTitle={week?.title || "Week"}
                  sbdWeekSummary={getShortSbdWeekSummary()}
                  weekStatsReport={weekStatsReport}
                />
              ) : null}
            </div>
          )}
      </section>

      {showAthleteExerciseFillPanel &&
        (() => {
          const selected = getSelectedAthleteExercise();
          if (!selected) return null;

          const { day, exercise } = selected;
          const setRows = getSetRowsForExercise(exercise);
          const dayIsPast = isDayPast(getDayDateObject(day));

          const closePanel = () => {
            setAthleteExercisePanelOpen(false);
            setSelectedAthleteExerciseId("");
            setAthleteNotePanelOpen(false);
            resetPreviousWeekData();
          };

          return (
            <AthleteExerciseFillPanel
              day={day}
              exercise={exercise}
              setRows={setRows}
              dayIsPast={dayIsPast}
              dayDateLabel={getDayDate(day)}
              exerciseTitle={
                normalizeExerciseName(exercise.name) || "Oefening invullen"
              }
              prescribedLabel={`${exercise.sets || "-"} sets · ${exercise.reps || "-"} reps · ${getDisplayIntensity(exercise)}`}
              loadingSets={loadingAthleteSets}
              notePanelOpen={athleteNotePanelOpen}
              exerciseNote={getAthleteExerciseNote(exercise.id)}
              previousWeekOpen={previousWeekOpen}
              loadingPreviousWeek={loadingPreviousWeekSets}
              previousWeekMessage={previousWeekMessage}
              previousWeekData={previousWeekData}
              uploadingVideoSetKey={uploadingVideoSetKey}
              onClose={closePanel}
              onToggleNotePanel={() =>
                setAthleteNotePanelOpen((open) => !open)
              }
              onExerciseNoteChange={(value) =>
                updateAthleteExerciseNoteLocal(exercise, value)
              }
              onExerciseNoteBlur={(value) =>
                saveAthleteExerciseNote(exercise, value)
              }
              onTogglePreviousWeek={() =>
                previousWeekOpen
                  ? resetPreviousWeekData()
                  : void loadPreviousWeekExerciseSets(day, exercise)
              }
              onOpenVideoRecorder={(setNumber) =>
                openVideoRecorder(exercise, setNumber)
              }
              onUpdateSet={(setNumber, field, value) =>
                updateAthleteSetLocal(exercise, setNumber, field, value)
              }
              onSaveSet={(setNumber, field, value) =>
                void saveAthleteSetField(exercise, setNumber, field, value)
              }
              onSetKeyDown={handleAthleteSetArrowNavigation}
              onCopySetDown={(row) => copyAthleteSetToNextRow(exercise, row)}
              onDeleteSetVideo={(setNumber) =>
                deleteAthleteSetVideo(exercise, setNumber)
              }
              getSetVideo={(setNumber) =>
                getAthleteSetVideo(exercise.id, setNumber)
              }
              getSetVideoKey={(setNumber) =>
                getAthleteSetVideoKey(exercise.id, setNumber)
              }
              getE1rmLabel={(row) => getInlineE1rmLabel(exercise, row)}
              getAverageFromRows={getAverageFromRows}
              readOnly={false}
              canRenameExercise={
                isAthleteView && isAthleteExtraExercise(exercise)
              }
              renamingExercise={renamingExtraExerciseId === exercise.id}
              onRenameExercise={
                isAthleteView && onRenameExtraExercise
                  ? (name) => onRenameExtraExercise(exercise.id, name)
                  : undefined
              }
              canChooseVariation={
                isAthleteView && isAthleteChoiceExercise(exercise)
              }
              choosingVariation={choosingVariationExerciseId === exercise.id}
              onChooseVariation={
                isAthleteView && onChooseExerciseVariation
                  ? (name) => onChooseExerciseVariation(exercise.id, name)
                  : undefined
              }
            />
          );
        })()}

      <ProgramAthleteVideoRecorder
        isOpen={videoRecorder.isOpen}
        videoRecorderTarget={videoRecorder.videoRecorderTarget}
        recordedVideoUrl={videoRecorder.recordedVideoUrl}
        cameraVideoRef={videoRecorder.cameraVideoRef}
        closeVideoRecorder={videoRecorder.closeVideoRecorder}
        toggleFlash={videoRecorder.toggleFlash}
        isRecordingVideo={videoRecorder.isRecordingVideo}
        flashOn={videoRecorder.flashOn}
        cameraError={videoRecorder.cameraError}
        formatVideoTime={videoRecorder.formatVideoTime}
        recordingSeconds={videoRecorder.recordingSeconds}
        galleryOpen={videoRecorder.galleryOpen}
        galleryFiles={videoRecorder.galleryFiles}
        setGalleryOpen={videoRecorder.setGalleryOpen}
        chooseGalleryFile={videoRecorder.chooseGalleryFile}
        galleryInputRef={videoRecorder.galleryInputRef}
        handleGalleryFiles={videoRecorder.handleGalleryFiles}
        handleRecordButtonClick={videoRecorder.handleRecordButtonClick}
        cameraReady={videoRecorder.cameraReady}
        switchCameraFacingMode={videoRecorder.switchCameraFacingMode}
        previewVideoRef={videoRecorder.previewVideoRef}
        muteVideoAudio={videoRecorder.muteVideoAudio}
        handlePreviewLoadedMetadata={videoRecorder.handlePreviewLoadedMetadata}
        trimSliderRef={videoRecorder.trimSliderRef}
        trimEnd={videoRecorder.trimEnd}
        videoDuration={videoRecorder.videoDuration}
        trimStart={videoRecorder.trimStart}
        activeTrimHandle={videoRecorder.activeTrimHandle}
        setActiveTrimHandle={videoRecorder.setActiveTrimHandle}
        updateTrimFromClientX={videoRecorder.updateTrimFromClientX}
        togglePreviewMute={videoRecorder.togglePreviewMute}
        scrollMobileFieldIntoView={videoRecorder.scrollMobileFieldIntoView}
        videoCaption={videoRecorder.videoCaption}
        setVideoCaption={videoRecorder.setVideoCaption}
        resetRecordedVideo={videoRecorder.resetRecordedVideo}
        trimmingVideo={videoRecorder.trimmingVideo}
        uploadingVideoSetKey={videoRecorder.uploadingVideoSetKey}
        saveRecordedVideo={videoRecorder.saveRecordedVideo}
      />
      </div>

      <ProgramWeekOverlays
        offlineQueueCount={offlineQueueCount}
        offlineSyncSyncing={offlineSyncSyncing}
        offlineSyncOnline={offlineSyncOnline}
        onRetryOfflineSync={onRetryOfflineSync}
        onDismissOfflineSync={onDismissOfflineSync}
        templateApplyOpen={templateApplyOpen}
        onCloseTemplateApply={() => setTemplateApplyOpen(false)}
        userId={userId}
        planningAthleteId={planningAthleteId}
        blockId={blockId}
        onTemplateApplied={(nextBlockId, nextWeekId) => {
          goToProgram(nextBlockId, nextWeekId);
        }}
        editingBlockId={editingBlockId}
        editingBlockTitle={editingBlockTitle}
        editingBlockStartDate={editingBlockStartDate}
        editingBlockMacrocycleId={editingBlockMacrocycleId}
        navMacrocycles={navMacrocycles}
        onCloseBlockEdit={() => {
          setEditingBlockId("");
          setEditingBlockTitle("");
          setEditingBlockStartDate("");
          setEditingBlockMacrocycleId("");
        }}
        onSaveBlockEdit={(payload) => {
          void renameBlock(editingBlockId, payload);
        }}
        editingWeekId={editingWeekId}
        editingWeekTitle={editingWeekTitle}
        onCloseWeekEdit={() => {
          setEditingWeekId("");
          setEditingWeekTitle("");
        }}
        onSaveWeekEdit={async (payload) => {
          const weekToEdit = Object.values(weeksByBlock)
            .flat()
            .find((item) => item.id === editingWeekId);

          if (!weekToEdit) return;

          await renameWeek(weekToEdit, payload.title, payload.note);
        }}
        linkingExercise={linkingExercise}
        libraryItems={libraryItems}
        onCloseLinkingExercise={() => setLinkingExercise(null)}
        onSelectLibraryItem={(item) => {
          if (linkingExercise) {
            void saveExerciseLibraryLink(linkingExercise.id, item.id);
          }
        }}
        previewLibraryItem={previewLibraryItem}
        onClosePreviewLibraryItem={() => setPreviewLibraryItem(null)}
        blockIntakeWizard={blockIntakeWizard}
        onCloseBlockIntakeWizard={() => setBlockIntakeWizard(null)}
        onCompleteBlockIntakeWizard={() => setBlockIntakeWizard(null)}
        planningSplitOpen={planningSplitOpen}
        role={role}
        embeddedInChat={embeddedInChat}
        planningPanelHeight={planningPanelHeight}
        onPlanningPanelHeightChange={setPlanningPanelHeight}
        onClosePlanningSplit={() => setPlanningSplitOpen(false)}
        athleteDisplayName={athleteDisplayName}
      />

      </MobilePullToRefreshInner>
    </main>
    </div>
  );
}
