// app/programs/[id]/weeks/[weekId]/page.tsx

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import { supabase } from "@/lib/supabaseClient";
import { sendExerciseVideoMessageToCoach } from "@/lib/chatUtils";
import { captureVideoThumbnail } from "@/lib/videoThumbnail";
import {
  isDayPast,
  isEmptyCheckinBw,
  isEmptyCheckinFatigue,
  isEmptyCheckinRecovery,
  isEmptySetField,
  OVERDUE_BUTTON_GROUP_CLASS,
  withOverdueInputClass,
} from "@/lib/programDayValidation";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

type ProgramBlock = {
  id: string;
  title: string;
  description: string | null;
  athlete_id: string | null;
  start_date: string | null;
};

type ProgramWeek = {
  id: string;
  title: string;
  week_number: number;
  program_block_id: string;
};

type ProgramDay = {
  id: string;
  title: string;
  day_number: number;
  program_week_id: string;
  notes: string | null;
  warmup: string | null;
};

type ProgramExercise = {
  id: string;
  program_day_id: string;
  name: string;
  sets: string | null;
  reps: string | null;
  load: string | null;
  rpe: string | null;
  notes: string | null;
  exercise_number: number | null;
  priority?: string | null;
};

type AthleteExerciseSet = {
  id?: string;
  program_exercise_id: string;
  athlete_id: string;
  set_number: number;
  reps: string | null;
  weight: string | null;
  rpe: string | null;
};

type AthleteExerciseNote = {
  id?: string;
  program_exercise_id: string;
  athlete_id: string;
  notes: string | null;
};

type AthleteExerciseVideo = {
  id?: string;
  program_exercise_id: string;
  athlete_id: string;
  set_number: number;
  video_url: string | null;
  video_path: string | null;
  file_name: string | null;
  caption: string | null;
};

type AthleteDayCheckin = {
  id?: string;
  program_day_id: string;
  athlete_id: string;
  bw: string | null;
  recovery: number | null;
  fatigue: number | null;
  notes: string | null;
};

type PreviousWeekSetData = {
  weekTitle: string;
  dayTitle: string;
  exerciseName: string;
  rows: AthleteExerciseSet[];
  athleteNote: string;
};

type VideoRecorderTarget = {
  exercise: ProgramExercise;
  setNumber: number;
};

const priorityOptions = [
  "primary",
  "secondary",
  "tertiary",
  "quaternary",
  "quinary",
  "senary",
  "septenary",
];


function isPriorityExercise(name: string) {
  const clean = name.toLowerCase();
  return (
    clean.includes("squat") ||
    clean.includes("bench") ||
    clean.includes("deadlift")
  );
}

function capitalizeExerciseName(value: string | null | undefined) {
  const cleanValue = (value || "").trim();

  if (!cleanValue) return "";

  return cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1);
}

function getPriorityClass(priority: string | null | undefined) {
  const value = priority || "primary";

  if (value === "primary") return "bg-red-100 text-red-700 border-red-200";
  if (value === "secondary") return "bg-orange-100 text-orange-700 border-orange-200";
  if (value === "tertiary") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (value === "quaternary") return "bg-green-100 text-green-700 border-green-200";
  if (value === "quinary") return "bg-blue-100 text-blue-700 border-blue-200";
  if (value === "senary") return "bg-purple-100 text-purple-700 border-purple-200";
  if (value === "septenary") return "bg-pink-100 text-pink-700 border-pink-200";

  return "bg-gray-100 text-gray-700 border-gray-200";
}

export default function ProgramWeekPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const blockId = params.id as string;
  const weekId = params.weekId as string;
  const athleteId = searchParams.get("athlete");
  const embeddedInChat = searchParams.get("embedded") === "chat";

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");

  const [currentBlock, setCurrentBlock] = useState<ProgramBlock | null>(null);
  const [week, setWeek] = useState<ProgramWeek | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);

  const [navBlocks, setNavBlocks] = useState<ProgramBlock[]>([]);
  const [weeksByBlock, setWeeksByBlock] = useState<
    Record<string, ProgramWeek[]>
  >({});
  const [openBlockIds, setOpenBlockIds] = useState<Record<string, boolean>>({});

  const [creatingBlock, setCreatingBlock] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockDescription, setNewBlockDescription] = useState("");
  const [newBlockStartDate, setNewBlockStartDate] = useState("");

  const [editingBlockId, setEditingBlockId] = useState("");
  const [editingBlockTitle, setEditingBlockTitle] = useState("");
  const [editingBlockStartDate, setEditingBlockStartDate] = useState("");

  const [creatingWeekBlockId, setCreatingWeekBlockId] = useState("");
  const [newWeekTitle, setNewWeekTitle] = useState("");

  const [editingWeekId, setEditingWeekId] = useState("");
  const [editingWeekTitle, setEditingWeekTitle] = useState("");

  const [draggedDayId, setDraggedDayId] = useState("");
  const [dragOverDayId, setDragOverDayId] = useState("");
  const originalDayOrderRef = useRef<string[]>([]);

  const [openDayNoteId, setOpenDayNoteId] = useState("");
  const [openDayWarmupId, setOpenDayWarmupId] = useState("");
  const [openExerciseNoteId, setOpenExerciseNoteId] = useState("");

  const [exercisesByDay, setExercisesByDay] = useState<
    Record<string, ProgramExercise[]>
  >({});

  const [isCreatingDay, setIsCreatingDay] = useState(false);
  const [newDayTitle, setNewDayTitle] = useState("");
  const newDayInputRef = useRef<HTMLInputElement | null>(null);

  const [creatingExerciseDayId, setCreatingExerciseDayId] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseSets, setExerciseSets] = useState("");
  const [exerciseReps, setExerciseReps] = useState("");
  const [exerciseIntensity, setExerciseIntensity] = useState("");
  const [exerciseIntensityType, setExerciseIntensityType] = useState("rpe");

  const exerciseNameInputRef = useRef<HTMLInputElement | null>(null);
  const [draggedExercise, setDraggedExercise] = useState<{
    dayId: string;
    exerciseId: string;
  } | null>(null);
  const [dragOverExerciseId, setDragOverExerciseId] = useState("");
  const originalExerciseOrderRef = useRef<string[]>([]);

  const [isPending, startTransition] = useTransition();
  const [navigatingUrl, setNavigatingUrl] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const saveStatusTimeoutRef = useRef<number | null>(null);

  const [athleteExercisePanelOpen, setAthleteExercisePanelOpen] =
    useState(false);
  const [selectedAthleteExerciseId, setSelectedAthleteExerciseId] =
    useState("");
  const [athleteSetInputs, setAthleteSetInputs] = useState<
    Record<string, AthleteExerciseSet[]>
  >({});
  const [loadingAthleteSets, setLoadingAthleteSets] = useState(false);
  const [athleteNotesByExercise, setAthleteNotesByExercise] = useState<
    Record<string, AthleteExerciseNote>
  >({});
  const [athleteVideosBySet, setAthleteVideosBySet] = useState<
    Record<string, AthleteExerciseVideo>
  >({});
  const [uploadingVideoSetKey, setUploadingVideoSetKey] = useState("");
  const [videoRecorderOpen, setVideoRecorderOpen] = useState(false);
  const [videoRecorderTarget, setVideoRecorderTarget] =
    useState<VideoRecorderTarget | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<
    "user" | "environment"
  >("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState("");
  const [recordedVideoFile, setRecordedVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimmingVideo, setTrimmingVideo] = useState(false);
  const [videoCaption, setVideoCaption] = useState("");
  const [flashOn, setFlashOn] = useState(false);
  const [muteVideoAudio, setMuteVideoAudio] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [activeTrimHandle, setActiveTrimHandle] = useState<"start" | "end" | null>(
    null,
  );
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const trimSliderRef = useRef<HTMLDivElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [athleteDayCheckins, setAthleteDayCheckins] = useState<
    Record<string, AthleteDayCheckin>
  >({});
  const [openAthleteDayNotesId, setOpenAthleteDayNotesId] = useState("");
  const [athleteNotePanelOpen, setAthleteNotePanelOpen] = useState(false);
  const [previousWeekOpen, setPreviousWeekOpen] = useState(false);
  const [loadingPreviousWeekSets, setLoadingPreviousWeekSets] = useState(false);
  const [previousWeekData, setPreviousWeekData] =
    useState<PreviousWeekSetData | null>(null);
  const [previousWeekMessage, setPreviousWeekMessage] = useState("");
  const [blockNavOpen, setBlockNavOpen] = useState(false);
  const [weekNavOpen, setWeekNavOpen] = useState(false);
  const blockNavRef = useRef<HTMLDivElement | null>(null);
  const weekNavRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setNavigatingUrl("");
    loadData();
  }, [blockId, weekId]);

  useEffect(() => {
    if (!creatingExerciseDayId) return;

    const timeout = window.setTimeout(() => {
      exerciseNameInputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [creatingExerciseDayId]);

  useEffect(() => {
    if (!isCreatingDay) return;

    const timeout = window.setTimeout(() => {
      newDayInputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [isCreatingDay]);

  useEffect(() => {
    loadVisibleAthleteSetInputs();
    loadVisibleAthleteExerciseNotes();
    loadVisibleAthleteSetVideos();
  }, [userId, athleteId, exercisesByDay]);

  useEffect(() => {
    loadVisibleAthleteDayCheckins();
  }, [userId, athleteId, days]);

  useEffect(() => {
    if (!videoRecorderOpen) {
      stopCameraStream();
      return;
    }

    if (recordedVideoUrl) {
      stopCameraStream();
    }
  }, [videoRecorderOpen, recordedVideoUrl]);

  useEffect(() => {
    if (!videoRecorderOpen || recordedVideoUrl) return;

    stopCameraStream();
    void startCameraStream();
  }, [cameraFacingMode]);

  useEffect(() => {
    void applyTorch(flashOn);
  }, [flashOn]);

  useEffect(() => {
    if (!videoRecorderOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    if (!recordedVideoUrl) {
      document.body.style.touchAction = "none";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [videoRecorderOpen, recordedVideoUrl]);

  useEffect(() => {
    if (!athleteExercisePanelOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [athleteExercisePanelOpen]);

  useEffect(() => {
    return () => {
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
      stopCameraStream();
      stopRecordingTimer();
    };
  }, [recordedVideoUrl]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (blockNavRef.current && !blockNavRef.current.contains(target)) {
        setBlockNavOpen(false);
      }

      if (weekNavRef.current && !weekNavRef.current.contains(target)) {
        setWeekNavOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function scrollMobileFieldIntoView(target: HTMLElement) {
    window.setTimeout(() => {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 300);
  }

  function setSavedSoon() {
    setSaveState("saved");

    if (saveStatusTimeoutRef.current) {
      window.clearTimeout(saveStatusTimeoutRef.current);
    }

    saveStatusTimeoutRef.current = window.setTimeout(() => {
      setSaveState("saved");
    }, 1200);
  }

  async function runSave(callback: () => Promise<void>) {
    try {
      setSaveState("saving");
      await callback();
      setSavedSoon();
    } catch (error: any) {
      console.error("SAVE ERROR:", error);
      console.error("SAVE ERROR JSON:", JSON.stringify(error, null, 2));

      setSaveState("error");

      alert(
        error?.message ||
          error?.details ||
          error?.hint ||
          JSON.stringify(error, null, 2) ||
          "Opslaan mislukt",
      );

      throw error;
    }
  }

  function getOwnerAthleteId() {
    return (
      athleteId || currentBlock?.athlete_id || (role === "atleet" ? userId : "")
    );
  }

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      setRole(profile.role || "");
    }

    const { data: blockData } = await supabase
      .from("program_blocks")
      .select("*")
      .eq("id", blockId)
      .single();

    setCurrentBlock(blockData || null);

    const { data: weekData } = await supabase
      .from("program_weeks")
      .select("*")
      .eq("id", weekId)
      .single();

    setWeek(weekData || null);

    await loadProgramNavigation(
      blockData || null,
      profile?.role || "",
      user.id,
    );
    await loadDays();
  }

  async function loadProgramNavigation(
    blockData: ProgramBlock | null,
    loadedRole: string,
    loadedUserId: string,
  ) {
    const ownerAthleteId =
      athleteId ||
      blockData?.athlete_id ||
      (loadedRole === "atleet" ? loadedUserId : "");

    if (!ownerAthleteId) return;

    const { data: blocksData } = await supabase
      .from("program_blocks")
      .select("*")
      .eq("athlete_id", ownerAthleteId)
      .order("start_date", { ascending: true });

    const loadedBlocks = blocksData || [];
    setNavBlocks(loadedBlocks);

    const blockIds = loadedBlocks.map((block) => block.id);

    if (blockIds.length === 0) {
      setWeeksByBlock({});
      return;
    }

    const { data: weeksData } = await supabase
      .from("program_weeks")
      .select("*")
      .in("program_block_id", blockIds)
      .order("week_number", { ascending: true });

    const grouped: Record<string, ProgramWeek[]> = {};

    loadedBlocks.forEach((block) => {
      grouped[block.id] = [];
    });

    (weeksData || []).forEach((item) => {
      if (!grouped[item.program_block_id]) grouped[item.program_block_id] = [];
      grouped[item.program_block_id].push(item);
    });

    setWeeksByBlock(grouped);

    const openState: Record<string, boolean> = {};
    loadedBlocks.forEach((block) => {
      openState[block.id] =
        block.id === blockId || openBlockIds[block.id] || false;
    });

    setOpenBlockIds(openState);
  }

  async function loadDays() {
    const { data } = await supabase
      .from("program_days")
      .select("*")
      .eq("program_week_id", weekId)
      .order("day_number", { ascending: true });

    const loadedDays = data || [];
    setDays(loadedDays);

    if (loadedDays.length > 0) {
      await loadExercisesForDays(loadedDays);
    } else {
      setExercisesByDay({});
    }
  }

  async function loadExercisesForDays(loadedDays: ProgramDay[]) {
    const dayIds = loadedDays.map((day) => day.id);

    const { data, error } = await supabase
      .from("program_exercises")
      .select("*")
      .in("program_day_id", dayIds)
      .order("exercise_number", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    const grouped: Record<string, ProgramExercise[]> = {};

    loadedDays.forEach((day) => {
      grouped[day.id] = [];
    });

    (data || []).forEach((exercise) => {
      if (!grouped[exercise.program_day_id]) {
        grouped[exercise.program_day_id] = [];
      }

      grouped[exercise.program_day_id].push(exercise);
    });

    setExercisesByDay(grouped);
  }

  function programUrl(targetBlockId: string, targetWeekId: string) {
    return athleteId
      ? `/programs/${targetBlockId}/weeks/${targetWeekId}?athlete=${athleteId}`
      : `/programs/${targetBlockId}/weeks/${targetWeekId}`;
  }

  function goToUrl(url: string) {
    if (!url || navigatingUrl === url) return;

    setNavigatingUrl(url);

    startTransition(() => {
      router.push(url);
    });
  }

  function goToProgram(targetBlockId: string, targetWeekId: string) {
    goToUrl(programUrl(targetBlockId, targetWeekId));
  }

  function goToBlock(targetBlockId: string) {
    if (targetBlockId === blockId) return;

    const blockWeeks = weeksByBlock[targetBlockId] || [];

    if (blockWeeks.length === 0) {
      goToUrl(programUrl(targetBlockId, weekId));
      return;
    }

    const preferredWeek =
      blockWeeks.find((item) => item.week_number === week?.week_number) ||
      blockWeeks[0];

    goToProgram(targetBlockId, preferredWeek.id);
  }

  function renderBlockWeekNav() {
    const blockWeeks = weeksByBlock[blockId] || [];
    const activeBlock = navBlocks.find((block) => block.id === blockId) || currentBlock;
    const activeWeek = blockWeeks.find((item) => item.id === weekId) || week;

    const activeBlockStart = activeBlock
      ? getBlockStartDateObject(activeBlock)
      : null;
    const activeBlockEnd = activeBlock
      ? getBlockEndDateObject(activeBlock, blockWeeks)
      : null;
    const activeWeekStart =
      activeBlock && activeWeek
        ? getWeekStartDateObject(activeBlock, activeWeek)
        : null;
    const activeWeekEnd =
      activeBlock && activeWeek
        ? getWeekEndDateObject(activeBlock, activeWeek)
        : null;

    return (
      <div className="sticky top-0 z-20 -mx-3 mb-4 space-y-3 border-b border-gray-200 bg-gray-100/95 px-3 pb-3 pt-1 backdrop-blur lg:hidden md:-mx-8 md:px-8">
        <div className="grid grid-cols-2 gap-2">
          <div ref={blockNavRef} className="relative min-w-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
              Block
            </p>
            <button
              type="button"
              onClick={() => {
                setWeekNavOpen(false);
                setBlockNavOpen((current) => !current);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-full border px-4 py-2 text-left text-sm font-bold transition active:scale-95 ${
                blockId
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-black"
              }`}
            >
              <span className="min-w-0 truncate">
                {activeBlock?.title || "Block"}
                <span
                  className={`block text-[11px] font-semibold ${
                    blockId ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  {formatDateRangeLabel(activeBlockStart, activeBlockEnd)}
                </span>
              </span>
              <span
                className={`shrink-0 text-xs ${
                  blockId ? "text-white/70" : "text-gray-400"
                }`}
              >
                ▼
              </span>
            </button>

            {blockNavOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-1 shadow-lg">
                {navBlocks.map((block) => {
                  const weeksForBlock = weeksByBlock[block.id] || [];
                  const blockStart = getBlockStartDateObject(block);
                  const blockEnd = getBlockEndDateObject(block, weeksForBlock);
                  const isActive = block.id === blockId;

                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => {
                        setBlockNavOpen(false);
                        goToBlock(block.id);
                      }}
                      className={`flex w-full flex-col px-4 py-2.5 text-left transition hover:bg-gray-50 ${
                        isActive ? "bg-gray-100" : ""
                      }`}
                    >
                      <span className="truncate text-sm font-bold text-black">
                        {block.title}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500">
                        {formatDateRangeLabel(blockStart, blockEnd)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div ref={weekNavRef} className="relative min-w-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
              Week
            </p>
            <button
              type="button"
              onClick={() => {
                setBlockNavOpen(false);
                setWeekNavOpen((current) => !current);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-full border px-4 py-2 text-left text-sm font-bold transition active:scale-95 ${
                weekId
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-black"
              }`}
            >
              <span className="min-w-0 truncate">
                {activeWeek?.title || "Week"}
                <span
                  className={`block text-[11px] font-semibold ${
                    weekId ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  {formatDateRangeLabel(activeWeekStart, activeWeekEnd)}
                </span>
              </span>
              <span
                className={`shrink-0 text-xs ${
                  weekId ? "text-white/70" : "text-gray-400"
                }`}
              >
                ▼
              </span>
            </button>

            {weekNavOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-1 shadow-lg">
                {blockWeeks.map((item) => {
                  const weekStart =
                    activeBlock ? getWeekStartDateObject(activeBlock, item) : null;
                  const weekEnd =
                    activeBlock ? getWeekEndDateObject(activeBlock, item) : null;
                  const isActive = item.id === weekId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setWeekNavOpen(false);
                        goToProgram(blockId, item.id);
                      }}
                      className={`flex w-full flex-col px-4 py-2.5 text-left transition hover:bg-gray-50 ${
                        isActive ? "bg-gray-100" : ""
                      }`}
                    >
                      <span className="truncate text-sm font-bold text-black">
                        {item.title}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500">
                        {formatDateRangeLabel(weekStart, weekEnd)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {role === "coach" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreatingBlock(true)}
              className="rounded-full border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-600 active:scale-95"
            >
              + Block
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatingWeekBlockId(blockId);
                setNewWeekTitle(`Week ${blockWeeks.length + 1}`);
              }}
              className="rounded-full border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-600 active:scale-95"
            >
              + Week
            </button>
          </div>
        )}

        {role === "coach" && creatingBlock && (
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <input
              value={newBlockTitle}
              onChange={(e) => setNewBlockTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createBlock();
              }}
              placeholder="Naam block"
              className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
            />
            <input
              type="date"
              value={newBlockStartDate}
              onChange={(e) => setNewBlockStartDate(e.target.value)}
              className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
            />
            <textarea
              value={newBlockDescription}
              onChange={(e) => setNewBlockDescription(e.target.value)}
              placeholder="Beschrijving"
              className="mb-2 min-h-[70px] w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={createBlock}
                className="flex-1 rounded-xl bg-black px-3 py-2 text-sm text-white"
              >
                Opslaan
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingBlock(false);
                  setNewBlockTitle("");
                  setNewBlockDescription("");
                  setNewBlockStartDate("");
                }}
                className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm text-black"
              >
                Annuleer
              </button>
            </div>
          </div>
        )}

        {role === "coach" && creatingWeekBlockId === blockId && (
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <input
              value={newWeekTitle}
              onChange={(e) => setNewWeekTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createWeek(blockId);
              }}
              placeholder="Naam week"
              className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => createWeek(blockId)}
                className="flex-1 rounded-xl bg-black px-3 py-2 text-sm text-white"
              >
                Opslaan
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingWeekBlockId("");
                  setNewWeekTitle("");
                }}
                className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm text-black"
              >
                Annuleer
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderBlocksSidebar() {
    return (
              <aside className="group/blocks sticky top-0 hidden h-screen self-start w-[70px] min-w-[70px] overflow-y-auto border-r border-gray-200 bg-white p-3 z-20 transition-all duration-200 hover:w-[300px] hover:min-w-[300px] lg:block">
                <div className="flex items-center justify-between mb-4">
                  <div className="opacity-0 group-hover/blocks:opacity-100 transition-all duration-150 overflow-hidden whitespace-nowrap">
                    <h2 className="text-lg font-bold">Blocks</h2>
                    <p className="text-xs text-gray-500">Blocks en weken</p>
                  </div>
      
                  <div className="opacity-100 group-hover/blocks:opacity-0 absolute left-5 top-5 text-xl">
                    📚
                  </div>
      
                  {role === "coach" && (
                    <button
                      type="button"
                      onClick={() => setCreatingBlock(true)}
                      className="w-9 h-9 min-w-9 rounded-xl bg-black text-white text-xl flex items-center justify-center"
                    >
                      +
                    </button>
                  )}
                </div>
      
                <div className="opacity-0 group-hover/blocks:opacity-100 transition-all duration-150">
                  {role === "coach" && creatingBlock && (
                    <div className="bg-gray-100 rounded-2xl p-3 mb-4">
                      <input
                        value={newBlockTitle}
                        onChange={(e) => setNewBlockTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createBlock();
                        }}
                        placeholder="Naam block"
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm mb-2 outline-none text-black"
                      />
      
                      <input
                        type="date"
                        value={newBlockStartDate}
                        onChange={(e) => setNewBlockStartDate(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createBlock();
                        }}
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm mb-2 outline-none text-black"
                      />
      
                      <textarea
                        value={newBlockDescription}
                        onChange={(e) => setNewBlockDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            createBlock();
                          }
                        }}
                        placeholder="Beschrijving"
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm mb-2 outline-none resize-none min-h-[70px] text-black"
                      />
      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={createBlock}
                          className="flex-1 bg-black text-white rounded-xl px-3 py-2 text-sm"
                        >
                          Opslaan
                        </button>
      
                        <button
                          type="button"
                          onClick={() => {
                            setCreatingBlock(false);
                            setNewBlockTitle("");
                            setNewBlockDescription("");
                            setNewBlockStartDate("");
                          }}
                          className="flex-1 bg-white text-black rounded-xl px-3 py-2 text-sm"
                        >
                          Annuleer
                        </button>
                      </div>
                    </div>
                  )}
      
                  <div className="space-y-3">
                    {navBlocks.map((block) => {
                      const isOpen = openBlockIds[block.id];
                      const activeBlock = block.id === blockId;
                      const blockWeeks = weeksByBlock[block.id] || [];
                      const isEditingBlock = editingBlockId === block.id;
      
                      return (
                        <div
                          key={block.id}
                          className={`rounded-2xl border overflow-hidden ${
                            activeBlock ? "border-black" : "border-gray-200"
                          }`}
                        >
                          <div
                            className={`p-3 ${
                              activeBlock
                                ? "bg-black text-white"
                                : "bg-gray-50 text-black"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenBlockIds((current) => ({
                                    ...current,
                                    [block.id]: !current[block.id],
                                  }))
                                }
                                className="flex-1 text-left"
                              >
                                <p
                                  className={`text-[10px] mb-1 ${
                                    activeBlock ? "text-gray-300" : "text-gray-400"
                                  }`}
                                >
                                  {formatDate(block.start_date)}
                                </p>
      
                                {!isEditingBlock && (
                                  <h3 className="font-bold text-sm leading-tight">
                                    {isOpen ? "⌄" : "›"} {block.title}
                                  </h3>
                                )}
                              </button>
      
                              {role === "coach" && !isEditingBlock && (
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setEditingBlockId(block.id);
                                      setEditingBlockTitle(block.title);
                                      setEditingBlockStartDate(
                                        block.start_date || "",
                                      );
                                    }}
                                    className={`w-7 h-7 rounded-lg text-xs ${
                                      activeBlock
                                        ? "bg-white/20 hover:bg-white/30 text-white"
                                        : "bg-white hover:bg-gray-100 text-black"
                                    }`}
                                    title="Aanpassen"
                                  >
                                    ✎
                                  </button>
      
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      duplicateBlock(block);
                                    }}
                                    className={`w-7 h-7 rounded-lg text-xs ${
                                      activeBlock
                                        ? "bg-white/20 hover:bg-white/30 text-white"
                                        : "bg-white hover:bg-gray-100 text-black"
                                    }`}
                                    title="Dupliceren"
                                  >
                                    ⧉
                                  </button>
      
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      deleteBlock(block);
                                    }}
                                    className={`w-7 h-7 rounded-lg text-xs ${
                                      activeBlock
                                        ? "bg-white/20 hover:bg-red-500 text-white"
                                        : "bg-white hover:bg-red-500 hover:text-white text-black"
                                    }`}
                                    title="Verwijderen"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
      
                            {isEditingBlock && (
                              <div className="mt-2 space-y-2">
                                <input
                                  value={editingBlockTitle}
                                  onChange={(e) =>
                                    setEditingBlockTitle(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") renameBlock(block.id);
                                  }}
                                  className="w-full rounded-xl px-3 py-2 text-sm text-black bg-white border border-gray-300 outline-none"
                                  placeholder="Naam block"
                                />
      
                                <input
                                  type="date"
                                  value={editingBlockStartDate}
                                  onChange={(e) =>
                                    setEditingBlockStartDate(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") renameBlock(block.id);
                                  }}
                                  className="w-full rounded-xl px-3 py-2 text-sm text-black bg-white border border-gray-300 outline-none"
                                />
      
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => renameBlock(block.id)}
                                    className="flex-1 bg-white text-black rounded-xl px-2 py-1 text-xs font-bold"
                                  >
                                    Opslaan
                                  </button>
      
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingBlockId("");
                                      setEditingBlockTitle("");
                                      setEditingBlockStartDate("");
                                    }}
                                    className="flex-1 bg-gray-200 text-black rounded-xl px-2 py-1 text-xs font-bold"
                                  >
                                    Stop
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
      
                          {isOpen && (
                            <div className="p-2 bg-white space-y-2">
                              {blockWeeks.map((item) => {
                                const activeWeek = item.id === weekId;
                                const isEditingWeek = editingWeekId === item.id;
      
                                return (
                                  <div
                                    key={item.id}
                                    className={`rounded-xl ${
                                      activeWeek
                                        ? "bg-black text-white"
                                        : "bg-gray-100 text-black"
                                    }`}
                                  >
                                    {!isEditingWeek && (
                                      <div className="flex items-center gap-2 p-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            goToProgram(block.id, item.id)
                                          }
                                          className="flex-1 text-left text-sm font-semibold"
                                        >
                                          {item.title}
                                        </button>
      
                                        {role === "coach" && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setEditingWeekId(item.id);
                                                setEditingWeekTitle(item.title);
                                              }}
                                              className={`w-7 h-7 rounded-lg text-xs ${
                                                activeWeek
                                                  ? "bg-white/20 text-white"
                                                  : "bg-white text-black"
                                              }`}
                                              title="Aanpassen"
                                            >
                                              ✎
                                            </button>
      
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                duplicateWeek(item);
                                              }}
                                              className={`w-7 h-7 rounded-lg text-xs ${
                                                activeWeek
                                                  ? "bg-white/20 text-white"
                                                  : "bg-white text-black"
                                              }`}
                                              title="Dupliceren"
                                            >
                                              ⧉
                                            </button>
      
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                deleteWeek(item);
                                              }}
                                              className={`w-7 h-7 rounded-lg text-xs ${
                                                activeWeek
                                                  ? "bg-white/20 hover:bg-red-500 text-white"
                                                  : "bg-white hover:bg-red-500 hover:text-white text-black"
                                              }`}
                                              title="Verwijderen"
                                            >
                                              ✕
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
      
                                    {isEditingWeek && (
                                      <div className="p-2">
                                        <input
                                          value={editingWeekTitle}
                                          onChange={(e) =>
                                            setEditingWeekTitle(e.target.value)
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") renameWeek(item);
                                          }}
                                          className="w-full rounded-xl px-3 py-2 text-sm text-black bg-white border border-gray-300 outline-none"
                                        />
      
                                        <div className="flex gap-2 mt-2">
                                          <button
                                            type="button"
                                            onClick={() => renameWeek(item)}
                                            className="flex-1 bg-black text-white rounded-xl px-2 py-1 text-xs"
                                          >
                                            Opslaan
                                          </button>
      
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingWeekId("");
                                              setEditingWeekTitle("");
                                            }}
                                            className="flex-1 bg-white rounded-xl px-2 py-1 text-xs text-black"
                                          >
                                            Stop
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
      
                              {role === "coach" &&
                                creatingWeekBlockId !== block.id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCreatingWeekBlockId(block.id);
                                      setNewWeekTitle(
                                        `Week ${blockWeeks.length + 1}`,
                                      );
                                    }}
                                    className="w-full rounded-xl border-2 border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-black hover:text-black"
                                  >
                                    + Week toevoegen
                                  </button>
                                )}
      
                              {role === "coach" &&
                                creatingWeekBlockId === block.id && (
                                  <div className="bg-gray-100 rounded-xl p-2">
                                    <input
                                      value={newWeekTitle}
                                      onChange={(e) =>
                                        setNewWeekTitle(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") createWeek(block.id);
                                      }}
                                      placeholder="Naam week"
                                      className="w-full rounded-xl px-3 py-2 text-sm outline-none mb-2 text-black bg-white border border-gray-300"
                                    />
      
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => createWeek(block.id)}
                                        className="flex-1 bg-black text-white rounded-xl px-2 py-1 text-xs"
                                      >
                                        Opslaan
                                      </button>
      
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCreatingWeekBlockId("");
                                          setNewWeekTitle("");
                                        }}
                                        className="flex-1 bg-white text-black rounded-xl px-2 py-1 text-xs"
                                      >
                                        Annuleer
                                      </button>
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </aside>
      
    );
  }

  async function createBlock() {
    if (!newBlockTitle.trim()) {
      alert("Vul een naam in voor het block");
      return;
    }

    if (!newBlockStartDate) {
      alert("Kies een startdatum");
      return;
    }

    const ownerAthleteId =
      athleteId ||
      currentBlock?.athlete_id ||
      (role === "atleet" ? userId : "");

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden voor dit block");
      return;
    }

    const { data: createdBlock, error } = await supabase
      .from("program_blocks")
      .insert({
        title: newBlockTitle.trim(),
        description: newBlockDescription.trim(),
        start_date: newBlockStartDate,
        created_by: userId,
        athlete_id: ownerAthleteId,
      })
      .select("*")
      .single();

    if (error || !createdBlock) {
      alert(error?.message || "Block kon niet worden aangemaakt");
      return;
    }

    const { data: createdWeek, error: weekError } = await supabase
      .from("program_weeks")
      .insert({
        title: "Week 1",
        week_number: 1,
        program_block_id: createdBlock.id,
      })
      .select("*")
      .single();

    if (weekError || !createdWeek) {
      alert(weekError?.message || "Week kon niet worden aangemaakt");
      return;
    }

    goToProgram(createdBlock.id, createdWeek.id);
  }

  async function renameBlock(blockIdToRename: string) {
    const cleanTitle = editingBlockTitle.trim();

    if (!cleanTitle) {
      alert("Vul een naam in");
      return;
    }

    const { data, error } = await supabase
      .from("program_blocks")
      .update({
        title: cleanTitle,
        start_date: editingBlockStartDate || null,
      })
      .eq("id", blockIdToRename)
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    if (!data) {
      alert("Block kon niet worden aangepast");
      return;
    }

    setNavBlocks((current) =>
      current.map((block) => (block.id === blockIdToRename ? data : block)),
    );

    if (currentBlock?.id === blockIdToRename) {
      setCurrentBlock(data);
    }

    setEditingBlockId("");
    setEditingBlockTitle("");
    setEditingBlockStartDate("");
    await loadProgramNavigation(data, role, userId);
  }

  function getNextBlockDuplicateTitle(blockToDuplicate: ProgramBlock) {
    const blockNumbers = navBlocks
      .map((block) => {
        const match = (block.title || "").match(/block\s*(\d+)/i);
        return match ? Number(match[1]) : null;
      })
      .filter(
        (value): value is number => value !== null && Number.isFinite(value),
      );

    const currentNumberMatch = (blockToDuplicate.title || "").match(
      /block\s*(\d+)/i,
    );
    const nextNumber =
      blockNumbers.length > 0
        ? Math.max(...blockNumbers) + 1
        : navBlocks.length + 1;

    if (currentNumberMatch) return `Block ${nextNumber}`;

    return `${blockToDuplicate.title} ${nextNumber}`.trim();
  }

  async function duplicateBlock(blockToDuplicate: ProgramBlock) {
    const ownerAthleteId =
      athleteId ||
      blockToDuplicate.athlete_id ||
      (role === "atleet" ? userId : "");

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden voor dit block");
      return;
    }

    const { data: createdBlock, error: blockError } = await supabase
      .from("program_blocks")
      .insert({
        title: getNextBlockDuplicateTitle(blockToDuplicate),
        description: blockToDuplicate.description || "",
        start_date: blockToDuplicate.start_date,
        created_by: userId,
        athlete_id: ownerAthleteId,
      })
      .select("*")
      .single();

    if (blockError || !createdBlock) {
      alert(blockError?.message || "Block kon niet worden gekopieerd");
      return;
    }

    const sourceWeeks = [...(weeksByBlock[blockToDuplicate.id] || [])].sort(
      (a, b) => a.week_number - b.week_number,
    );

    let firstCreatedWeekId = "";

    for (const sourceWeek of sourceWeeks) {
      const createdWeek = await copyWeekWithContent(
        sourceWeek,
        createdBlock.id,
        sourceWeek.week_number,
        sourceWeek.title,
      );

      if (!createdWeek) return;
      if (!firstCreatedWeekId) firstCreatedWeekId = createdWeek.id;
    }

    if (!firstCreatedWeekId) {
      const { data: createdWeek, error: weekError } = await supabase
        .from("program_weeks")
        .insert({
          title: "Week 1",
          week_number: 1,
          program_block_id: createdBlock.id,
        })
        .select("*")
        .single();

      if (weekError || !createdWeek) {
        alert(weekError?.message || "Week kon niet worden aangemaakt");
        return;
      }

      firstCreatedWeekId = createdWeek.id;
    }

    window.location.href = programUrl(createdBlock.id, firstCreatedWeekId);
  }

  async function deleteBlock(blockToDelete: ProgramBlock) {
    const { data: blockWeeks } = await supabase
      .from("program_weeks")
      .select("id")
      .eq("program_block_id", blockToDelete.id);

    const weekIds = (blockWeeks || []).map((item) => item.id);

    if (weekIds.length > 0) {
      const { data: blockDays } = await supabase
        .from("program_days")
        .select("id")
        .in("program_week_id", weekIds);

      const dayIds = (blockDays || []).map((day) => day.id);

      if (dayIds.length > 0) {
        const { error: exerciseError } = await supabase
          .from("program_exercises")
          .delete()
          .in("program_day_id", dayIds);

        if (exerciseError) {
          alert(exerciseError.message);
          return;
        }

        const { error: daysError } = await supabase
          .from("program_days")
          .delete()
          .in("id", dayIds);

        if (daysError) {
          alert(daysError.message);
          return;
        }
      }

      const { error: weeksError } = await supabase
        .from("program_weeks")
        .delete()
        .in("id", weekIds);

      if (weeksError) {
        alert(weeksError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("program_blocks")
      .delete()
      .eq("id", blockToDelete.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (blockToDelete.id === blockId) {
      window.location.href = athleteId
        ? `/programs?athlete=${athleteId}`
        : "/programs";
      return;
    }

    await loadData();
  }

  async function copyWeekWithContent(
    sourceWeek: ProgramWeek,
    targetBlockId: string,
    targetWeekNumber: number,
    targetTitle: string,
  ) {
    const { data: createdWeek, error: weekError } = await supabase
      .from("program_weeks")
      .insert({
        title: targetTitle,
        week_number: targetWeekNumber,
        program_block_id: targetBlockId,
      })
      .select("*")
      .single();

    if (weekError || !createdWeek) {
      alert(weekError?.message || "Week kon niet worden gekopieerd");
      return null;
    }

    const { data: sourceDays, error: daysLoadError } = await supabase
      .from("program_days")
      .select("*")
      .eq("program_week_id", sourceWeek.id)
      .order("day_number", { ascending: true });

    if (daysLoadError) {
      alert(daysLoadError.message);
      return null;
    }

    for (const sourceDay of sourceDays || []) {
      const { data: createdDay, error: dayError } = await supabase
        .from("program_days")
        .insert({
          title: sourceDay.title,
          day_number: sourceDay.day_number,
          program_week_id: createdWeek.id,
          notes: sourceDay.notes || "",
          warmup: sourceDay.warmup || "",
        })
        .select("*")
        .single();

      if (dayError || !createdDay) {
        alert(dayError?.message || "Dag kon niet worden gekopieerd");
        return null;
      }

      const { data: sourceExercises, error: exercisesLoadError } =
        await supabase
          .from("program_exercises")
          .select("*")
          .eq("program_day_id", sourceDay.id)
          .order("created_at", { ascending: true });

      if (exercisesLoadError) {
        alert(exercisesLoadError.message);
        return null;
      }

      if ((sourceExercises || []).length > 0) {
        const exercisesToInsert = (sourceExercises || []).map((exercise) => ({
          program_day_id: createdDay.id,
          name: capitalizeExerciseName(exercise.name),
          sets: exercise.sets || "",
          reps: exercise.reps || "",
          load: exercise.load || "",
          rpe: exercise.rpe || "",
          notes: exercise.notes || "",
          priority: exercise.priority || "",
        }));

        const { error: insertExercisesError } = await supabase
          .from("program_exercises")
          .insert(exercisesToInsert);

        if (insertExercisesError) {
          alert(insertExercisesError.message);
          return null;
        }
      }
    }

    return createdWeek as ProgramWeek;
  }

  async function duplicateWeek(weekToDuplicate: ProgramWeek) {
    const blockWeeks = [
      ...(weeksByBlock[weekToDuplicate.program_block_id] || []),
    ].sort((a, b) => a.week_number - b.week_number);

    const newWeekNumber = weekToDuplicate.week_number + 1;
    const weeksToMove = blockWeeks.filter(
      (item) =>
        item.week_number >= newWeekNumber && item.id !== weekToDuplicate.id,
    );

    for (const item of weeksToMove.reverse()) {
      const { error } = await supabase
        .from("program_weeks")
        .update({ week_number: item.week_number + 1 })
        .eq("id", item.id);

      if (error) {
        alert(error.message);
        return;
      }
    }

    const createdWeek = await copyWeekWithContent(
      weekToDuplicate,
      weekToDuplicate.program_block_id,
      newWeekNumber,
      `Week ${newWeekNumber}`,
    );

    if (!createdWeek) return;

    window.location.href = programUrl(
      weekToDuplicate.program_block_id,
      createdWeek.id,
    );
  }

  async function createWeek(targetBlockId: string) {
    if (!newWeekTitle.trim()) {
      alert("Vul een naam in voor de week");
      return;
    }

    const currentWeeks = weeksByBlock[targetBlockId] || [];
    const nextWeekNumber =
      currentWeeks.length > 0
        ? Math.max(...currentWeeks.map((item) => item.week_number)) + 1
        : 1;

    const { data, error } = await supabase
      .from("program_weeks")
      .insert({
        title: newWeekTitle.trim(),
        week_number: nextWeekNumber,
        program_block_id: targetBlockId,
      })
      .select("*")
      .single();

    if (error || !data) {
      alert(error?.message || "Week kon niet worden aangemaakt");
      return;
    }

    setCreatingWeekBlockId("");
    setNewWeekTitle("");
    goToProgram(targetBlockId, data.id);
  }

  async function renameWeek(weekToRename: ProgramWeek) {
    const cleanTitle = editingWeekTitle.trim();

    if (!cleanTitle) {
      alert("Vul een naam in");
      return;
    }

    const { data, error } = await supabase
      .from("program_weeks")
      .update({
        title: cleanTitle,
      })
      .eq("id", weekToRename.id)
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    if (!data) {
      alert("Week kon niet worden aangepast");
      return;
    }

    setWeeksByBlock((current) => ({
      ...current,
      [weekToRename.program_block_id]: (
        current[weekToRename.program_block_id] || []
      ).map((item) => (item.id === weekToRename.id ? data : item)),
    }));

    if (week?.id === weekToRename.id) {
      setWeek(data);
    }

    setEditingWeekId("");
    setEditingWeekTitle("");
    await loadProgramNavigation(currentBlock, role, userId);
  }

  async function deleteWeek(weekToDelete: ProgramWeek) {
    const { data: weekDays } = await supabase
      .from("program_days")
      .select("id")
      .eq("program_week_id", weekToDelete.id);

    const dayIds = (weekDays || []).map((day) => day.id);

    if (dayIds.length > 0) {
      const { error: exerciseError } = await supabase
        .from("program_exercises")
        .delete()
        .in("program_day_id", dayIds);

      if (exerciseError) {
        alert(exerciseError.message);
        return;
      }

      const { error: daysError } = await supabase
        .from("program_days")
        .delete()
        .in("id", dayIds);

      if (daysError) {
        alert(daysError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("program_weeks")
      .delete()
      .eq("id", weekToDelete.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (weekToDelete.id === weekId) {
      const otherWeek = (
        weeksByBlock[weekToDelete.program_block_id] || []
      ).find((item) => item.id !== weekToDelete.id);

      if (otherWeek) {
        goToProgram(weekToDelete.program_block_id, otherWeek.id);
      } else {
        window.location.href = athleteId
          ? `/programs?athlete=${athleteId}`
          : "/programs";
      }

      return;
    }

    await loadData();
  }

  async function createDay(dayNumber: number) {
    if (!newDayTitle.trim()) {
      alert("Vul een naam in voor de dag");
      return;
    }

    const { error } = await supabase.from("program_days").insert({
      title: newDayTitle.trim(),
      day_number: dayNumber,
      program_week_id: weekId,
      notes: "",
      warmup: "",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewDayTitle("");
    setIsCreatingDay(false);
    await loadDays();
  }

  function updateDayLocal(
    dayId: string,
    field: "notes" | "warmup",
    value: string,
  ) {
    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              [field]: value,
            }
          : day,
      ),
    );
  }

  async function saveDayField(
    dayId: string,
    field: "notes" | "warmup",
    value: string,
  ) {
    await runSave(async () => {
      const { error } = await supabase
        .from("program_days")
        .update({
          [field]: value,
        })
        .eq("id", dayId);

      if (error) throw error;
    });

    setOpenDayNoteId("");
    setOpenDayWarmupId("");
  }

  async function deleteDayField(dayId: string, field: "notes" | "warmup") {
    const previousDay = days.find((day) => day.id === dayId);
    updateDayLocal(dayId, field, "");

    try {
      await runSave(async () => {
        const { error } = await supabase
          .from("program_days")
          .update({
            [field]: "",
          })
          .eq("id", dayId);

        if (error) throw error;
      });
    } catch {
      if (previousDay) updateDayLocal(dayId, field, previousDay[field] || "");
      await loadDays();
      return;
    }

    if (field === "notes") setOpenDayNoteId("");
    if (field === "warmup") setOpenDayWarmupId("");
  }

  async function addExercise(dayId: string) {
    if (!exerciseName.trim()) {
      alert("Vul een oefening in");
      return;
    }

    const intensityValue = exerciseIntensity.trim();

    const loadValue =
      exerciseIntensityType === "kg" || exerciseIntensityType === "%"
        ? intensityValue
          ? `${intensityValue}${exerciseIntensityType}`
          : ""
        : "";

    const rpeValue = exerciseIntensityType === "rpe" ? intensityValue : "";

    try {
      await runSave(async () => {
        const { error } = await supabase.from("program_exercises").insert({
          program_day_id: dayId,
          name: capitalizeExerciseName(exerciseName),
          sets: exerciseSets.trim(),
          reps: exerciseReps.trim(),
          load: loadValue,
          rpe: rpeValue,
          notes: "",
          exercise_number: (exercisesByDay[dayId] || []).length + 1,
          priority: "",
        });

        if (error) throw error;
      });
    } catch {
      return;
    }

    setExerciseName("");
    setExerciseSets("");
    setExerciseReps("");
    setExerciseIntensity("");
    setExerciseIntensityType("rpe");
    setCreatingExerciseDayId("");

    await loadDays();
  }

  function updateExerciseLocal(
    dayId: string,
    exerciseId: string,
    field: keyof ProgramExercise,
    value: string,
  ) {
    setExercisesByDay((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              [field]: value,
            }
          : exercise,
      ),
    }));
  }

  async function saveExerciseField(
    exerciseId: string,
    field: "name" | "sets" | "reps" | "load" | "rpe" | "notes",
    value: string,
  ) {
    const cleanValue = field === "name" ? capitalizeExerciseName(value) : value.trim();
    const previousExercisesByDay = exercisesByDay;

    setExercisesByDay((current) => {
      const next = { ...current };

      Object.keys(next).forEach((dayId) => {
        next[dayId] = (next[dayId] || []).map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                [field]: cleanValue,
              }
            : exercise,
        );
      });

      return next;
    });

    try {
      await runSave(async () => {
        const { error } = await supabase
          .from("program_exercises")
          .update({
            [field]: cleanValue,
          })
          .eq("id", exerciseId);

        if (error) throw error;
      });
    } catch {
      setExercisesByDay(previousExercisesByDay);
      await loadDays();
      return;
    }

    if (field === "notes") {
      setOpenExerciseNoteId("");
    }
  }

  async function saveExerciseFields(
    exerciseId: string,
    updates: Partial<
      Pick<ProgramExercise, "name" | "sets" | "reps" | "load" | "rpe" | "notes">
    >,
  ) {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [
        key,
        typeof value === "string"
          ? key === "name"
            ? capitalizeExerciseName(value)
            : value.trim()
          : value,
      ]),
    );
    const previousExercisesByDay = exercisesByDay;

    setExercisesByDay((current) => {
      const next = { ...current };

      Object.keys(next).forEach((dayId) => {
        next[dayId] = (next[dayId] || []).map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                ...cleanUpdates,
              }
            : exercise,
        );
      });

      return next;
    });

    try {
      await runSave(async () => {
        const { error } = await supabase
          .from("program_exercises")
          .update(cleanUpdates)
          .eq("id", exerciseId);

        if (error) throw error;
      });
    } catch {
      setExercisesByDay(previousExercisesByDay);
      await loadDays();
    }
  }

  async function saveExercisePriority(exerciseId: string, priority: string) {
    const previousExercisesByDay = exercisesByDay;

    setExercisesByDay((current) => {
      const next = { ...current };

      Object.keys(next).forEach((dayId) => {
        next[dayId] = (next[dayId] || []).map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                priority,
              }
            : exercise,
        );
      });

      return next;
    });

    try {
      await runSave(async () => {
        const { error } = await supabase
          .from("program_exercises")
          .update({ priority })
          .eq("id", exerciseId);

        if (error) throw error;
      });
    } catch {
      setExercisesByDay(previousExercisesByDay);
      await loadDays();
    }
  }

  function handleCoachExerciseEnter(
    e: React.KeyboardEvent<HTMLInputElement>,
    exerciseId: string,
    field: "name" | "sets" | "reps" | "load" | "rpe",
    value: string,
  ) {
    if (e.key !== "Enter") return;

    e.preventDefault();
    saveExerciseField(exerciseId, field, value);
    e.currentTarget.blur();
  }

  async function deleteExerciseNote(dayId: string, exerciseId: string) {
    const previousExercisesByDay = exercisesByDay;
    updateExerciseLocal(dayId, exerciseId, "notes", "");

    try {
      await runSave(async () => {
        const { error } = await supabase
          .from("program_exercises")
          .update({
            notes: "",
          })
          .eq("id", exerciseId);

        if (error) throw error;
      });
    } catch {
      setExercisesByDay(previousExercisesByDay);
      await loadDays();
      return;
    }

    setOpenExerciseNoteId("");
  }

  async function updateIntensityType(
    dayId: string,
    exercise: ProgramExercise,
    type: string,
  ) {
    const currentIntensity = exercise.rpe || exercise.load || "";

    const cleanValue = currentIntensity
      .replace("%", "")
      .replace("kg", "")
      .replace("KG", "")
      .trim();

    const newLoad = type === "%" || type === "kg" ? `${cleanValue}${type}` : "";
    const newRpe = type === "rpe" ? cleanValue : "";
    const previousExercisesByDay = exercisesByDay;

    setExercisesByDay((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((item) =>
        item.id === exercise.id
          ? {
              ...item,
              load: newLoad,
              rpe: newRpe,
            }
          : item,
      ),
    }));

    try {
      await runSave(async () => {
        const { error } = await supabase
          .from("program_exercises")
          .update({
            load: newLoad,
            rpe: newRpe,
          })
          .eq("id", exercise.id);

        if (error) throw error;
      });
    } catch {
      setExercisesByDay(previousExercisesByDay);
      await loadDays();
    }
  }

  async function deleteExercise(exerciseId: string) {
    const { error } = await supabase
      .from("program_exercises")
      .delete()
      .eq("id", exerciseId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadDays();
  }

  async function deleteDay(dayId: string) {
    const { error: exerciseError } = await supabase
      .from("program_exercises")
      .delete()
      .eq("program_day_id", dayId);

    if (exerciseError) {
      alert(exerciseError.message);
      return;
    }

    const { error } = await supabase
      .from("program_days")
      .delete()
      .eq("id", dayId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadDays();
  }

  async function duplicateDay(dayToDuplicate: ProgramDay) {
    const newDayNumber = dayToDuplicate.day_number + 1;
    const daysToMove = days.filter(
      (item) =>
        item.day_number >= newDayNumber && item.id !== dayToDuplicate.id,
    );

    for (const item of daysToMove.reverse()) {
      const { error } = await supabase
        .from("program_days")
        .update({ day_number: item.day_number + 1 })
        .eq("id", item.id);

      if (error) {
        alert(error.message);
        return;
      }
    }

    const { data: createdDay, error: dayError } = await supabase
      .from("program_days")
      .insert({
        title: dayToDuplicate.title,
        day_number: newDayNumber,
        program_week_id: weekId,
        notes: dayToDuplicate.notes || "",
        warmup: dayToDuplicate.warmup || "",
      })
      .select("*")
      .single();

    if (dayError || !createdDay) {
      alert(dayError?.message || "Dag kon niet worden gedupliceerd");
      return;
    }

    const sourceExercises = [...(exercisesByDay[dayToDuplicate.id] || [])].sort(
      (a, b) => (a.exercise_number || 0) - (b.exercise_number || 0),
    );

    if (sourceExercises.length > 0) {
      const exercisesToInsert = sourceExercises.map((exercise, index) => ({
        program_day_id: createdDay.id,
        name: capitalizeExerciseName(exercise.name),
        sets: exercise.sets || "",
        reps: exercise.reps || "",
        load: exercise.load || "",
        rpe: exercise.rpe || "",
        notes: exercise.notes || "",
        exercise_number: index + 1,
      }));

      const { error: exerciseError } = await supabase
        .from("program_exercises")
        .insert(exercisesToInsert);

      if (exerciseError) {
        alert(exerciseError.message);
        return;
      }
    }

    await loadDays();
  }

  function handleDragStart(dayId: string) {
    setDraggedDayId(dayId);
    originalDayOrderRef.current = days.map((day) => day.id);
  }

  function handleDragOver(
    e: React.DragEvent<HTMLDivElement>,
    targetDayId: string,
  ) {
    e.preventDefault();

    if (!draggedDayId || draggedDayId === targetDayId) return;

    setDragOverDayId(targetDayId);

    setDays((currentDays) => {
      const draggedIndex = currentDays.findIndex(
        (day) => day.id === draggedDayId,
      );
      const targetIndex = currentDays.findIndex(
        (day) => day.id === targetDayId,
      );

      if (draggedIndex === -1 || targetIndex === -1) return currentDays;

      const reorderedDays = [...currentDays];
      const [draggedDay] = reorderedDays.splice(draggedIndex, 1);

      reorderedDays.splice(targetIndex, 0, draggedDay);

      return reorderedDays.map((day, index) => ({
        ...day,
        day_number: index + 1,
      }));
    });
  }

  async function saveDayOrder() {
    if (!draggedDayId) return;

    const currentOrder = days.map((day) => day.id);
    const originalOrder = originalDayOrderRef.current;

    const orderChanged =
      currentOrder.length !== originalOrder.length ||
      currentOrder.some((id, index) => id !== originalOrder[index]);

    setDraggedDayId("");
    setDragOverDayId("");

    if (!orderChanged) return;

    const updates = days.map((day, index) =>
      supabase
        .from("program_days")
        .update({
          day_number: index + 1,
        })
        .eq("id", day.id),
    );

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);

    if (failed?.error) {
      alert(failed.error.message);
      await loadDays();
    }
  }

  function handleExerciseDragStart(dayId: string, exerciseId: string) {
    setDraggedExercise({ dayId, exerciseId });
    originalExerciseOrderRef.current = (exercisesByDay[dayId] || []).map(
      (exercise) => exercise.id,
    );
  }

  function handleExerciseDragOver(
    e: React.DragEvent<HTMLDivElement>,
    dayId: string,
    targetExerciseId: string,
  ) {
    e.preventDefault();
    e.stopPropagation();

    if (
      !draggedExercise ||
      draggedExercise.dayId !== dayId ||
      draggedExercise.exerciseId === targetExerciseId
    ) {
      return;
    }

    setDragOverExerciseId(targetExerciseId);

    setExercisesByDay((current) => {
      const currentExercises = current[dayId] || [];
      const draggedIndex = currentExercises.findIndex(
        (exercise) => exercise.id === draggedExercise.exerciseId,
      );
      const targetIndex = currentExercises.findIndex(
        (exercise) => exercise.id === targetExerciseId,
      );

      if (draggedIndex === -1 || targetIndex === -1) return current;

      const reorderedExercises = [...currentExercises];
      const [movedExercise] = reorderedExercises.splice(draggedIndex, 1);
      reorderedExercises.splice(targetIndex, 0, movedExercise);

      return {
        ...current,
        [dayId]: reorderedExercises.map((exercise, index) => ({
          ...exercise,
          exercise_number: index + 1,
        })),
      };
    });
  }

  async function saveExerciseOrder(dayId: string) {
    if (!draggedExercise || draggedExercise.dayId !== dayId) return;

    const currentExercises = exercisesByDay[dayId] || [];
    const currentOrder = currentExercises.map((exercise) => exercise.id);
    const originalOrder = originalExerciseOrderRef.current;

    const orderChanged =
      currentOrder.length !== originalOrder.length ||
      currentOrder.some((id, index) => id !== originalOrder[index]);

    setDraggedExercise(null);
    setDragOverExerciseId("");

    if (!orderChanged) return;

    const updates = currentExercises.map((exercise, index) =>
      supabase
        .from("program_exercises")
        .update({
          exercise_number: index + 1,
        })
        .eq("id", exercise.id),
    );

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);

    if (failed?.error) {
      alert(failed.error.message);
      await loadDays();
    }
  }

  function handleNewExerciseFormKeyDown(
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    dayId: string,
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      addExercise(dayId);
      return;
    }

    const arrowKeys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];

    if (!arrowKeys.includes(e.key)) return;

    const wrapper = e.currentTarget.closest('[data-new-exercise-form="true"]');
    const fields = Array.from(
      wrapper?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input, select",
      ) || [],
    );

    const currentIndex = fields.indexOf(e.currentTarget);

    if (currentIndex === -1) return;

    e.preventDefault();

    const nextIndex =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? currentIndex + 1
        : currentIndex - 1;

    const nextField = fields[nextIndex];

    if (!nextField) return;

    nextField.focus();

    if (nextField instanceof HTMLInputElement) {
      nextField.select();
    }
  }

  function getIntensityValue(exercise: ProgramExercise) {
    if (exercise.rpe) return exercise.rpe;

    if (exercise.load) {
      return exercise.load.replace("%", "").replace("kg", "").replace("KG", "");
    }

    return "";
  }

  function getIntensityType(exercise: ProgramExercise) {
    if (exercise.rpe) return "rpe";
    if (exercise.load?.includes("%")) return "%";
    if (exercise.load?.toLowerCase().includes("kg")) return "kg";

    return "rpe";
  }

  function getDayDateObject(dayNumber: number) {
    if (!currentBlock?.start_date || !week?.week_number) return null;

    const date = new Date(currentBlock.start_date);
    date.setHours(0, 0, 0, 0);

    date.setDate(date.getDate() + (week.week_number - 1) * 7 + (dayNumber - 1));

    return date;
  }

  function formatDutchDateWithFullMonth(date: Date) {
    const months = [
      "januari",
      "februari",
      "maart",
      "april",
      "mei",
      "juni",
      "juli",
      "augustus",
      "september",
      "oktober",
      "november",
      "december",
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);

    return `${day} ${month} '${year}`;
  }

  function getDayDate(dayNumber: number) {
    const date = getDayDateObject(dayNumber);

    if (!date) return "Geen datum";

    return formatDutchDateWithFullMonth(date);
  }

  function formatDate(date: string | null) {
    if (!date) return "Geen startdatum";

    return formatDutchDateWithFullMonth(new Date(date));
  }

  function formatShortDutchDate(date: Date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}-${month}`;
  }

  function getBlockStartDateObject(block: ProgramBlock) {
    if (!block.start_date) return null;

    const date = new Date(block.start_date);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function getBlockEndDateObject(block: ProgramBlock, blockWeeks: ProgramWeek[]) {
    const start = getBlockStartDateObject(block);
    if (!start) return null;

    const weekCount = Math.max(blockWeeks.length, 1);
    const end = new Date(start);
    end.setDate(end.getDate() + weekCount * 7 - 1);
    return end;
  }

  function getWeekStartDateObject(block: ProgramBlock, programWeek: ProgramWeek) {
    const start = getBlockStartDateObject(block);
    if (!start) return null;

    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + (programWeek.week_number - 1) * 7);
    return weekStart;
  }

  function getWeekEndDateObject(block: ProgramBlock, programWeek: ProgramWeek) {
    const weekStart = getWeekStartDateObject(block, programWeek);
    if (!weekStart) return null;

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return weekEnd;
  }

  function formatDateRangeLabel(
    start: Date | null,
    end: Date | null,
    fallback = "Geen datum",
  ) {
    if (!start || !end) return fallback;
    return `${formatShortDutchDate(start)} - ${formatShortDutchDate(end)}`;
  }

  function hasExercises(dayId: string) {
    return (exercisesByDay[dayId] || []).length > 0;
  }

  function getExerciseColorClass(exerciseName: string | null | undefined) {
    const cleanName = (exerciseName || "").toLowerCase();

    if (cleanName.includes("squat")) {
      return "bg-[#6fa8dc] border-[#6fa8dc] hover:bg-[#669fd3]";
    }

    if (
      cleanName.includes("benchpress") ||
      cleanName.includes("bench press") ||
      cleanName.includes("bench")
    ) {
      return "bg-[#9fc5e8] border-[#9fc5e8] hover:bg-[#94badf]";
    }

    if (cleanName.includes("deadlift")) {
      return "bg-[#cfe2f3] border-[#cfe2f3] hover:bg-[#c4d7e8]";
    }

    return "bg-gray-50 border-gray-200 hover:border-black hover:bg-gray-100";
  }

  function getCoachExerciseColorClass(exerciseName: string | null | undefined) {
    const cleanName = (exerciseName || "").toLowerCase();

    if (cleanName.includes("squat")) {
      return "bg-[#6fa8dc] text-black";
    }

    if (
      cleanName.includes("benchpress") ||
      cleanName.includes("bench press") ||
      cleanName.includes("bench")
    ) {
      return "bg-[#9fc5e8] text-black";
    }

    if (cleanName.includes("deadlift")) {
      return "bg-[#cfe2f3] text-black";
    }

    return "bg-gray-100 text-black";
  }

  function getExercisePriority(exercise: ProgramExercise) {
    return (exercise.priority || "").toString().trim().toLowerCase();
  }

  function getExercisePriorityLabel(exercise: ProgramExercise) {
    const priority = getExercisePriority(exercise);

    if (!priority) return "";
    if (priority === "primary") return "Primary";
    if (priority === "secondary") return "Secondary";
    if (priority === "tertiary") return "Tertiary";
    if (priority === "quaternary") return "Quaternary";
    if (priority === "quinary") return "Quinary";
    if (priority === "senary") return "Senary";
    if (priority === "septenary") return "Septenary";

    return "";
  }

  function getExercisePriorityClass(exercise: ProgramExercise) {
    const priority = getExercisePriority(exercise);

    if (!priority) {
      return "bg-gray-50 text-gray-500 border-gray-200";
    }

    if (priority === "primary") {
      return "bg-red-100 text-red-700 border-red-200";
    }

    if (priority === "secondary") {
      return "bg-orange-100 text-orange-700 border-orange-200";
    }

    if (priority === "tertiary") {
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }

    if (priority === "quaternary") {
      return "bg-green-100 text-green-700 border-green-200";
    }

    if (priority === "quinary") {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }

    if (priority === "senary") {
      return "bg-purple-100 text-purple-700 border-purple-200";
    }

    if (priority === "septenary") {
      return "bg-pink-100 text-pink-700 border-pink-200";
    }

    return "bg-gray-100 text-gray-700 border-gray-200";
  }

  function getDisplayIntensity(exercise: ProgramExercise) {
    const value = getIntensityValue(exercise).trim();
    const type = getIntensityType(exercise);

    if (!value) return "-";
    if (type === "%") return `${value}%`;
    if (type === "kg") return `${value} kg`;

    return `RPE ${value}`;
  }

  function getWeightValue(exercise: ProgramExercise) {
    if (!exercise.load) return "";

    return exercise.load
      .replace("%", "")
      .replace("kg", "")
      .replace("KG", "")
      .trim();
  }

  function parseNumberValue(value: string | null | undefined) {
    if (!value) return null;

    const cleanValue = value.toString().replace(",", ".").trim();
    const match = cleanValue.match(/-?\d+(\.\d+)?/);

    if (!match) return null;

    const numberValue = Number(match[0]);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  function formatAverageValue(value: number) {
    const roundedValue = Math.round(value * 10) / 10;

    if (Number.isInteger(roundedValue)) {
      return String(roundedValue);
    }

    return roundedValue.toFixed(1).replace(".", ",");
  }

  function getAthleteSetAverage(
    exercise: ProgramExercise,
    field: "reps" | "weight" | "rpe",
  ) {
    const rows = getSetRowsForExercise(exercise);
    const values = rows
      .map((row) => parseNumberValue(row[field]))
      .filter((value): value is number => value !== null);

    if (values.length === 0) return "-";

    const average =
      values.reduce((total, value) => total + value, 0) / values.length;
    return formatAverageValue(average);
  }

  function getAverageFromRows(
    rows: AthleteExerciseSet[],
    field: "reps" | "weight" | "rpe",
  ) {
    const values = rows
      .map((row) => parseNumberValue(row[field]))
      .filter((value): value is number => value !== null);

    if (values.length === 0) return "-";

    const average =
      values.reduce((total, value) => total + value, 0) / values.length;
    return formatAverageValue(average);
  }

  function resetPreviousWeekData() {
    setPreviousWeekOpen(false);
    setPreviousWeekData(null);
    setPreviousWeekMessage("");
    setLoadingPreviousWeekSets(false);
  }

  async function loadPreviousWeekExerciseSets(
    currentDay: ProgramDay,
    currentExercise: ProgramExercise,
  ) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId || !currentBlock?.id || !week?.week_number) {
      setPreviousWeekMessage("Vorige week kon niet worden geladen.");
      return;
    }

    if (week.week_number <= 1) {
      setPreviousWeekData(null);
      setPreviousWeekMessage("Er is geen vorige week in dit block.");
      setPreviousWeekOpen(true);
      return;
    }

    setPreviousWeekOpen(true);
    setLoadingPreviousWeekSets(true);
    setPreviousWeekData(null);
    setPreviousWeekMessage("");

    const { data: previousWeek, error: previousWeekError } = await supabase
      .from("program_weeks")
      .select("*")
      .eq("program_block_id", currentBlock.id)
      .eq("week_number", week.week_number - 1)
      .maybeSingle();

    if (previousWeekError) {
      setLoadingPreviousWeekSets(false);
      setPreviousWeekMessage(previousWeekError.message);
      return;
    }

    if (!previousWeek) {
      setLoadingPreviousWeekSets(false);
      setPreviousWeekMessage("Er is geen vorige week gevonden.");
      return;
    }

    const { data: previousDays, error: previousDaysError } = await supabase
      .from("program_days")
      .select("*")
      .eq("program_week_id", previousWeek.id)
      .order("day_number", { ascending: true });

    if (previousDaysError) {
      setLoadingPreviousWeekSets(false);
      setPreviousWeekMessage(previousDaysError.message);
      return;
    }

    const sameDay = (previousDays || []).find(
      (item) => item.day_number === currentDay.day_number,
    );

    const dayIds = sameDay
      ? [sameDay.id]
      : (previousDays || []).map((item) => item.id);

    if (dayIds.length === 0) {
      setLoadingPreviousWeekSets(false);
      setPreviousWeekMessage("Vorige week heeft nog geen dagen.");
      return;
    }

    const { data: previousExercises, error: previousExercisesError } =
      await supabase
        .from("program_exercises")
        .select("*")
        .in("program_day_id", dayIds)
        .order("exercise_number", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

    if (previousExercisesError) {
      setLoadingPreviousWeekSets(false);
      setPreviousWeekMessage(previousExercisesError.message);
      return;
    }

    const cleanName = (currentExercise.name || "").trim().toLowerCase();
    const previousExercise = (previousExercises || []).find(
      (item) => (item.name || "").trim().toLowerCase() === cleanName,
    );

    if (!previousExercise) {
      setLoadingPreviousWeekSets(false);
      setPreviousWeekMessage("Deze oefening is vorige week niet gevonden.");
      return;
    }

    const previousDay = (previousDays || []).find(
      (item) => item.id === previousExercise.program_day_id,
    );

    const { data: previousRows, error: previousRowsError } = await supabase
      .from("athlete_exercise_sets")
      .select("*")
      .eq("program_exercise_id", previousExercise.id)
      .eq("athlete_id", ownerAthleteId)
      .order("set_number", { ascending: true });

    const { data: previousNote, error: previousNoteError } = await supabase
      .from("athlete_exercise_notes")
      .select("*")
      .eq("program_exercise_id", previousExercise.id)
      .eq("athlete_id", ownerAthleteId)
      .maybeSingle();

    setLoadingPreviousWeekSets(false);

    if (previousRowsError) {
      setPreviousWeekMessage(previousRowsError.message);
      return;
    }

    if (previousNoteError) {
      setPreviousWeekMessage(previousNoteError.message);
      return;
    }

    if (
      (!previousRows || previousRows.length === 0) &&
      !previousNote?.notes?.trim()
    ) {
      setPreviousWeekMessage(
        "Vorige week zijn er nog geen sets of athlete notes ingevuld voor deze oefening.",
      );
      return;
    }

    setPreviousWeekData({
      weekTitle: previousWeek.title || `Week ${previousWeek.week_number}`,
      dayTitle: previousDay?.title || "Vorige week",
      exerciseName: previousExercise.name || currentExercise.name || "Oefening",
      rows: previousRows || [],
      athleteNote: previousNote?.notes || "",
    });
  }

  async function loadVisibleAthleteDayCheckins() {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId || days.length === 0) return;

    const dayIds = days
      .map((day) => day.id)
      .filter((dayId) => !athleteDayCheckins[dayId]);

    if (dayIds.length === 0) return;

    const { data, error } = await supabase
      .from("athlete_day_checkins")
      .select("*")
      .eq("athlete_id", ownerAthleteId)
      .in("program_day_id", dayIds);

    if (error) {
      console.error("LOAD DAY CHECKIN ERROR:", error);
      console.error(
        "LOAD DAY CHECKIN ERROR JSON:",
        JSON.stringify(error, null, 2),
      );
      return;
    }

    const grouped: Record<string, AthleteDayCheckin> = {};

    dayIds.forEach((dayId) => {
      grouped[dayId] = {
        program_day_id: dayId,
        athlete_id: ownerAthleteId,
        bw: "",
        recovery: null,
        fatigue: null,
        notes: "",
      };
    });

    (data || []).forEach((row) => {
      grouped[row.program_day_id] = row;
    });

    setAthleteDayCheckins((current) => ({
      ...current,
      ...grouped,
    }));
  }

  function getAthleteDayCheckin(dayId: string) {
    const ownerAthleteId = getOwnerAthleteId();

    return (
      athleteDayCheckins[dayId] || {
        program_day_id: dayId,
        athlete_id: ownerAthleteId,
        bw: "",
        recovery: null,
        fatigue: null,
        notes: "",
      }
    );
  }

  function updateAthleteDayCheckinLocal(
    dayId: string,
    updates: Partial<AthleteDayCheckin>,
  ) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) return;

    setAthleteDayCheckins((current) => ({
      ...current,
      [dayId]: {
        ...(current[dayId] || {
          program_day_id: dayId,
          athlete_id: ownerAthleteId,
          bw: "",
          recovery: null,
          fatigue: null,
          notes: "",
        }),
        ...updates,
      },
    }));
  }

  async function saveAthleteDayCheckin(
    dayId: string,
    updates: Partial<AthleteDayCheckin>,
  ) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden");
      return;
    }

    const currentCheckin = getAthleteDayCheckin(dayId);
    const nextCheckin = {
      program_day_id: dayId,
      athlete_id: ownerAthleteId,
      bw: updates.bw !== undefined ? updates.bw : currentCheckin.bw || "",
      recovery:
        updates.recovery !== undefined
          ? updates.recovery
          : currentCheckin.recovery,
      fatigue:
        updates.fatigue !== undefined
          ? updates.fatigue
          : currentCheckin.fatigue,
      notes:
        updates.notes !== undefined
          ? updates.notes
          : currentCheckin.notes || "",
    };

    const previousCheckins = athleteDayCheckins;

    setAthleteDayCheckins((current) => ({
      ...current,
      [dayId]: nextCheckin,
    }));

    try {
      await runSave(async () => {
        const { data: existingCheckin, error: findError } = await supabase
          .from("athlete_day_checkins")
          .select("id")
          .eq("program_day_id", dayId)
          .eq("athlete_id", ownerAthleteId)
          .maybeSingle();

        if (findError) throw findError;

        if (existingCheckin?.id) {
          const { error: updateError } = await supabase
            .from("athlete_day_checkins")
            .update({
              bw: nextCheckin.bw,
              recovery: nextCheckin.recovery,
              fatigue: nextCheckin.fatigue,
              notes: nextCheckin.notes,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingCheckin.id);

          if (updateError) throw updateError;
          return;
        }

        const { error: insertError } = await supabase
          .from("athlete_day_checkins")
          .insert(nextCheckin);

        if (insertError) throw insertError;
      });
    } catch {
      setAthleteDayCheckins(previousCheckins);
    }
  }

  async function loadVisibleAthleteSetInputs() {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) return;

    const exerciseIds = Object.values(exercisesByDay)
      .flat()
      .map((exercise) => exercise.id)
      .filter((exerciseId) => !athleteSetInputs[exerciseId]);

    if (exerciseIds.length === 0) return;

    const { data, error } = await supabase
      .from("athlete_exercise_sets")
      .select("*")
      .eq("athlete_id", ownerAthleteId)
      .in("program_exercise_id", exerciseIds)
      .order("set_number", { ascending: true });

    if (error) {
      console.error("LOAD ERROR:", error);
      console.error("LOAD ERROR JSON:", JSON.stringify(error, null, 2));
      return;
    }

    const grouped: Record<string, AthleteExerciseSet[]> = {};

    exerciseIds.forEach((exerciseId) => {
      grouped[exerciseId] = [];
    });

    (data || []).forEach((row) => {
      if (!grouped[row.program_exercise_id])
        grouped[row.program_exercise_id] = [];
      grouped[row.program_exercise_id].push(row);
    });

    setAthleteSetInputs((current) => ({
      ...current,
      ...grouped,
    }));
  }

  async function loadVisibleAthleteExerciseNotes() {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) return;

    const exerciseIds = Object.values(exercisesByDay)
      .flat()
      .map((exercise) => exercise.id)
      .filter((exerciseId) => !athleteNotesByExercise[exerciseId]);

    if (exerciseIds.length === 0) return;

    const { data, error } = await supabase
      .from("athlete_exercise_notes")
      .select("*")
      .eq("athlete_id", ownerAthleteId)
      .in("program_exercise_id", exerciseIds);

    if (error) {
      console.error("LOAD ERROR:", error);
      console.error("LOAD ERROR JSON:", JSON.stringify(error, null, 2));
      return;
    }

    const grouped: Record<string, AthleteExerciseNote> = {};

    exerciseIds.forEach((exerciseId) => {
      grouped[exerciseId] = {
        program_exercise_id: exerciseId,
        athlete_id: ownerAthleteId,
        notes: "",
      };
    });

    (data || []).forEach((row) => {
      grouped[row.program_exercise_id] = row;
    });

    setAthleteNotesByExercise((current) => ({
      ...current,
      ...grouped,
    }));
  }

  function getAthleteSetVideoKey(exerciseId: string, setNumber: number) {
    return `${exerciseId}-${setNumber}`;
  }

  async function loadVisibleAthleteSetVideos() {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) return;

    const visiblePairs = Object.values(exercisesByDay)
      .flat()
      .flatMap((exercise) =>
        buildEmptySetRows(exercise).map((row) => ({
          exerciseId: exercise.id,
          setNumber: row.set_number,
          key: getAthleteSetVideoKey(exercise.id, row.set_number),
        })),
      )
      .filter((item) => !athleteVideosBySet[item.key]);

    if (visiblePairs.length === 0) return;

    const exerciseIds = Array.from(
      new Set(visiblePairs.map((item) => item.exerciseId)),
    );

    const { data, error } = await supabase
      .from("athlete_exercise_videos")
      .select("*")
      .eq("athlete_id", ownerAthleteId)
      .in("program_exercise_id", exerciseIds);

    if (error) {
      console.error("LOAD VIDEO ERROR:", error);
      console.error("LOAD VIDEO ERROR JSON:", JSON.stringify(error, null, 2));
      return;
    }

    const grouped: Record<string, AthleteExerciseVideo> = {};

    visiblePairs.forEach((item) => {
      grouped[item.key] = {
        program_exercise_id: item.exerciseId,
        athlete_id: ownerAthleteId,
        set_number: item.setNumber,
        video_url: null,
        video_path: null,
        file_name: null,
        caption: null,
      };
    });

    (data || []).forEach((row) => {
      const setNumber = row.set_number || 1;
      grouped[getAthleteSetVideoKey(row.program_exercise_id, setNumber)] = {
        ...row,
        set_number: setNumber,
      };
    });

    setAthleteVideosBySet((current) => ({
      ...current,
      ...grouped,
    }));
  }

  function getAthleteSetVideo(exerciseId: string, setNumber: number) {
    return athleteVideosBySet[getAthleteSetVideoKey(exerciseId, setNumber)];
  }

  function getSupportedVideoMimeType() {
    const types = [
      "video/mp4;codecs=h264,aac",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function getRecordedFileExtension(type: string) {
    return type.includes("mp4") ? "mp4" : "webm";
  }

  function stopRecordingTimer() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function openVideoRecorder(exercise: ProgramExercise, setNumber: number) {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Je browser ondersteunt opnemen in de app niet.");
      return;
    }

    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

    setVideoRecorderTarget({ exercise, setNumber });
    setRecordedVideoUrl("");
    setRecordedVideoFile(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    setGalleryFiles([]);
    setMuteVideoAudio(false);
    setFlashOn(false);
    setActiveTrimHandle(null);
    setVideoCaption(
      getAthleteSetVideo(exercise.id, setNumber)?.caption?.trim() || "",
    );
    setCameraError("");
    setCameraReady(false);
    setVideoRecorderOpen(true);
    // iOS Safari requires getUserMedia inside the tap/click handler.
    void startCameraStream();
  }

  function closeVideoRecorder() {
    if (isRecordingVideo) {
      mediaRecorderRef.current?.stop();
    }

    stopCameraStream();
    setVideoRecorderOpen(false);
    setVideoRecorderTarget(null);
    setIsRecordingVideo(false);
    stopRecordingTimer();
    setRecordingSeconds(0);
    setCameraReady(false);
    setCameraError("");

    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

    setRecordedVideoUrl("");
    setRecordedVideoFile(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    setGalleryFiles([]);
    setMuteVideoAudio(false);
    setFlashOn(false);
    setActiveTrimHandle(null);
    setVideoCaption("");
  }

  function isIgnorableCameraError(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";

    return /aborted|AbortError|interrupted by a new load request/i.test(message);
  }

  function getCameraErrorMessage(error: unknown) {
    if (isIgnorableCameraError(error)) return "";

    const message = error instanceof Error ? error.message : String(error);

    return (
      message ||
      "Camera kon niet worden geopend. Geef Safari/Chrome toestemming voor camera en microfoon."
    );
  }

  async function playCameraPreview() {
    if (!cameraVideoRef.current) return;

    try {
      await cameraVideoRef.current.play();
    } catch (error) {
      if (!isIgnorableCameraError(error)) {
        console.warn("CAMERA PREVIEW PLAY ERROR:", error);
      }
    }
  }

  async function startCameraStream() {
    setCameraError("");

    if (cameraStreamRef.current) {
      if (
        cameraVideoRef.current &&
        cameraVideoRef.current.srcObject !== cameraStreamRef.current
      ) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
        await playCameraPreview();
      }
      setCameraReady(true);
      await applyTorch(flashOn);
      return;
    }

    setCameraReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      cameraStreamRef.current = stream;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await playCameraPreview();
      }

      setCameraReady(true);
      await applyTorch(flashOn);
    } catch (error: any) {
      console.error("CAMERA ERROR:", error);
      const message = getCameraErrorMessage(error);
      if (message) {
        setCameraError(message);
      }
      setCameraReady(false);
    }
  }

  function stopCameraStream() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }

  async function applyTorch(nextFlashOn: boolean) {
    const videoTrack = cameraStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & {
        torch?: boolean;
      };
      if (!capabilities?.torch) return;

      await videoTrack.applyConstraints({
        advanced: [{ torch: nextFlashOn } as MediaTrackConstraintSet],
      });
    } catch (error) {
      console.warn("FLASH NOT SUPPORTED:", error);
      if (nextFlashOn) setFlashOn(false);
    }
  }

  function toggleFlash() {
    setFlashOn((current) => !current);
  }

  function switchCameraFacingMode() {
    if (isRecordingVideo) return;
    setFlashOn(false);
    setCameraFacingMode((current) =>
      current === "environment" ? "user" : "environment",
    );
  }

  function handleRecordButtonClick() {
    if (isRecordingVideo) {
      stopVideoRecording();
    } else {
      startVideoRecording();
    }
  }

  function handleGalleryFiles(files: FileList | null) {
    const videos = Array.from(files || []).filter((file) =>
      file.type.startsWith("video/"),
    );

    if (videos.length === 0) {
      alert("Kies minimaal één video uit je camerarol");
      return;
    }

    setGalleryFiles(videos);
    setGalleryOpen(true);
  }

  function chooseGalleryFile(file: File) {
    if (!file.type.startsWith("video/")) {
      alert("Kies een video uit je camerarol");
      return;
    }

    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

    const url = URL.createObjectURL(file);
    setRecordedVideoFile(file);
    setRecordedVideoUrl(url);
    setTrimStart(0);
    setTrimEnd(0);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    stopRecordingTimer();
    setIsRecordingVideo(false);
  }

  function startVideoRecording() {
    const stream = cameraStreamRef.current;

    if (!stream) {
      alert("Camera is nog niet klaar");
      return;
    }

    const mimeType = getSupportedVideoMimeType();

    try {
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordingType = recorder.mimeType || mimeType || "video/mp4";
        const extension = getRecordedFileExtension(recordingType);
        const blob = new Blob(recordedChunksRef.current, {
          type: recordingType,
        });
        const file = new File([blob], `recording-${Date.now()}.${extension}`, {
          type: recordingType,
        });
        const url = URL.createObjectURL(blob);

        if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

        setRecordedVideoFile(file);
        setRecordedVideoUrl(url);
        setTrimStart(0);
        setTrimEnd(0);
        stopRecordingTimer();
        setIsRecordingVideo(false);
      };

      recorder.start(250);
      setRecordingSeconds(0);
      stopRecordingTimer();
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
      setIsRecordingVideo(true);
    } catch (error: any) {
      console.error("RECORD ERROR:", error);
      alert(error?.message || "Opnemen mislukt");
      setIsRecordingVideo(false);
    }
  }

  function stopVideoRecording() {
    if (!mediaRecorderRef.current) return;

    stopRecordingTimer();

    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  function resetRecordedVideo() {
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

    setRecordedVideoUrl("");
    setRecordedVideoFile(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setActiveTrimHandle(null);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    setCameraError("");
    setVideoCaption("");

    window.setTimeout(() => {
      if (!videoRecorderOpen) return;

      if (cameraStreamRef.current && cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
        void playCameraPreview();
        setCameraReady(true);
        return;
      }

      void startCameraStream();
    }, 80);
  }

  function handlePreviewLoadedMetadata() {
    const duration = previewVideoRef.current?.duration || 0;

    if (!Number.isFinite(duration) || duration <= 0) return;

    setVideoDuration(duration);
    setTrimStart(0);
    setTrimEnd(duration);
  }

  function formatVideoTime(value: number) {
    const totalSeconds = Math.max(0, Math.floor(value));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function togglePreviewMute() {
    setMuteVideoAudio((current) => {
      const nextValue = !current;
      if (previewVideoRef.current) {
        previewVideoRef.current.muted = nextValue;
        previewVideoRef.current.volume = nextValue ? 0 : 1;
      }
      return nextValue;
    });
  }

  function updateTrimFromClientX(clientX: number, handle?: "start" | "end") {
    if (!trimSliderRef.current || !videoDuration) return;

    const rect = trimSliderRef.current.getBoundingClientRect();
    const rawPercent = (clientX - rect.left) / rect.width;
    const nextTime = Math.min(
      videoDuration,
      Math.max(0, rawPercent * videoDuration),
    );
    const minGap = Math.min(0.4, Math.max(0.1, videoDuration / 30));
    const currentEnd = trimEnd || videoDuration;
    const chosenHandle =
      handle ||
      (Math.abs(nextTime - trimStart) <= Math.abs(nextTime - currentEnd)
        ? "start"
        : "end");

    if (chosenHandle === "start") {
      const nextStart = Math.min(nextTime, currentEnd - minGap);
      setTrimStart(nextStart);
      if (previewVideoRef.current) previewVideoRef.current.currentTime = nextStart;
      return;
    }

    const nextEnd = Math.max(nextTime, trimStart + minGap);
    setTrimEnd(nextEnd);
    if (previewVideoRef.current) previewVideoRef.current.currentTime = nextEnd;
  }

  async function getFFmpeg() {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;

    const ffmpeg = ffmpegRef.current || new FFmpeg();
    ffmpegRef.current = ffmpeg;

    if (!ffmpeg.loaded) {
      await ffmpeg.load();
    }

    return ffmpeg;
  }

  async function trimVideoFile(file: File, start: number, end: number) {
    const effectiveEnd = end > 0 ? end : videoDuration;

    if (
      !muteVideoAudio &&
      (!videoDuration ||
        (start <= 0.05 &&
          effectiveEnd >= Math.max(videoDuration - 0.05, 0)))
    ) {
      return file;
    }

    const safeStart = Math.max(0, start);
    const safeEnd = videoDuration
      ? Math.min(videoDuration, effectiveEnd || videoDuration)
      : Math.max(effectiveEnd || 0, safeStart + 0.5);

    if (safeEnd <= safeStart) {
      return file;
    }

    setTrimmingVideo(true);

    try {
      const ffmpeg = await getFFmpeg();
      const inputName = file.name.toLowerCase().endsWith(".webm")
        ? "input.webm"
        : "input.mp4";
      const outputName = "output.mp4";

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      const ffmpegArgs = [
        "-ss",
        String(safeStart),
        "-to",
        String(safeEnd),
        "-i",
        inputName,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
      ];

      if (muteVideoAudio) {
        ffmpegArgs.push("-an");
      } else {
        ffmpegArgs.push("-c:a", "aac");
      }

      ffmpegArgs.push(outputName);
      await ffmpeg.exec(ffmpegArgs);

      const output = await ffmpeg.readFile(outputName);
      const outputData =
        output instanceof Uint8Array ? output : new TextEncoder().encode(output);
      const fixedOutputData = new Uint8Array(outputData as Uint8Array).buffer;

      const trimmedBlob = new Blob([fixedOutputData], {
        type: "video/mp4",
      });

      await ffmpeg.deleteFile(inputName).catch(() => undefined);
      await ffmpeg.deleteFile(outputName).catch(() => undefined);

      return new File([trimmedBlob], `trimmed-${Date.now()}.mp4`, {
        type: "video/mp4",
      });
    } finally {
      setTrimmingVideo(false);
    }
  }

  async function saveRecordedVideo() {
    if (!videoRecorderTarget || !recordedVideoFile) {
      alert("Neem eerst een video op");
      return;
    }

    const endTime = trimEnd || videoDuration || 0;
    let fileToUpload = recordedVideoFile;

    try {
      try {
        fileToUpload = await trimVideoFile(
          recordedVideoFile,
          trimStart,
          endTime,
        );
      } catch (trimError) {
        console.error("TRIM ERROR, uploading original video:", trimError);
        fileToUpload = recordedVideoFile;
      }

      await uploadAthleteSetVideo(
        videoRecorderTarget.exercise,
        videoRecorderTarget.setNumber,
        fileToUpload,
        videoCaption.trim() || null,
      );

      closeVideoRecorder();
    } catch (error: any) {
      console.error("SAVE VIDEO ERROR:", error);
      alert(error?.message || "Video opslaan mislukt");
    }
  }

  async function uploadAthleteSetVideo(
    exercise: ProgramExercise,
    setNumber: number,
    file: File | null,
    caption: string | null = null,
  ) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden");
      return;
    }

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Kies een videobestand");
      return;
    }

    const maxSizeMb = 250;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      alert(`Video is te groot. Maximaal ${maxSizeMb} MB.`);
      return;
    }

    const videoKey = getAthleteSetVideoKey(exercise.id, setNumber);
    const previousVideos = athleteVideosBySet;

    setUploadingVideoSetKey(videoKey);

    try {
      const currentVideo = athleteVideosBySet[videoKey];

      if (currentVideo?.video_path) {
        await supabase.storage
          .from("exercise-videos")
          .remove([currentVideo.video_path]);
      }

      const extension = file.name.split(".").pop() || "mp4";
      const safeFileName = `${Date.now()}-set-${setNumber}.${extension}`;
      const filePath = `${ownerAthleteId}/${exercise.id}/set-${setNumber}/${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("exercise-videos")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("exercise-videos")
        .getPublicUrl(filePath);

      const videoRow = {
        program_exercise_id: exercise.id,
        athlete_id: ownerAthleteId,
        set_number: setNumber,
        video_url: publicUrlData.publicUrl,
        video_path: filePath,
        file_name: file.name,
        caption,
      };

      const { data: existingVideo, error: findError } = await supabase
        .from("athlete_exercise_videos")
        .select("id")
        .eq("program_exercise_id", exercise.id)
        .eq("athlete_id", ownerAthleteId)
        .eq("set_number", setNumber)
        .maybeSingle();

      if (findError) throw findError;

      if (existingVideo?.id) {
        const { error: updateError } = await supabase
          .from("athlete_exercise_videos")
          .update(videoRow)
          .eq("id", existingVideo.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("athlete_exercise_videos")
          .insert(videoRow);

        if (insertError) throw insertError;
      }

      setAthleteVideosBySet((current) => ({
        ...current,
        [videoKey]: videoRow,
      }));

      let thumbnailUrl: string | null = null;

      try {
        const thumbnailBlob = await captureVideoThumbnail(file);
        const thumbnailPath = `${ownerAthleteId}/${exercise.id}/set-${setNumber}/thumb-${Date.now()}.jpg`;

        const { error: thumbnailUploadError } = await supabase.storage
          .from("exercise-videos")
          .upload(thumbnailPath, thumbnailBlob, {
            upsert: true,
            contentType: "image/jpeg",
          });

        if (!thumbnailUploadError) {
          const { data: thumbnailPublicUrl } = supabase.storage
            .from("exercise-videos")
            .getPublicUrl(thumbnailPath);

          thumbnailUrl = thumbnailPublicUrl.publicUrl;
        }
      } catch (thumbnailError) {
        console.error("VIDEO THUMBNAIL ERROR:", thumbnailError);
      }

      if (role === "atleet" && userId) {
        const setRow = getSetRowsForExercise(exercise).find(
          (row) => row.set_number === setNumber,
        );

        const { error: chatError } = await sendExerciseVideoMessageToCoach({
          athleteId: userId,
          videoUrl: publicUrlData.publicUrl,
          thumbnailUrl,
          caption,
          exerciseName: capitalizeExerciseName(exercise.name),
          setNumber,
          reps: setRow?.reps || null,
          coachReps: exercise.reps || null,
          weight: setRow?.weight || null,
          rpe: setRow?.rpe || null,
        });

        if (chatError) {
          console.error("CHAT VIDEO MESSAGE ERROR:", chatError);
        }
      }
    } catch (error: any) {
      console.error("VIDEO UPLOAD ERROR:", error);
      console.error("VIDEO UPLOAD ERROR JSON:", JSON.stringify(error, null, 2));
      setAthleteVideosBySet(previousVideos);
      alert(
        error?.message ||
          error?.details ||
          error?.hint ||
          "Video uploaden mislukt",
      );
    } finally {
      setUploadingVideoSetKey("");
    }
  }

  async function deleteAthleteSetVideo(
    exercise: ProgramExercise,
    setNumber: number,
  ) {
    const ownerAthleteId = getOwnerAthleteId();
    const videoKey = getAthleteSetVideoKey(exercise.id, setNumber);
    const currentVideo = athleteVideosBySet[videoKey];

    if (!ownerAthleteId || !currentVideo?.video_url) return;

    const previousVideos = athleteVideosBySet;

    setAthleteVideosBySet((current) => ({
      ...current,
      [videoKey]: {
        ...currentVideo,
        video_url: null,
        video_path: null,
        file_name: null,
        caption: null,
      },
    }));

    try {
      if (currentVideo.video_path) {
        const { error: storageError } = await supabase.storage
          .from("exercise-videos")
          .remove([currentVideo.video_path]);

        if (storageError) throw storageError;
      }

      const { error } = await supabase
        .from("athlete_exercise_videos")
        .delete()
        .eq("program_exercise_id", exercise.id)
        .eq("athlete_id", ownerAthleteId)
        .eq("set_number", setNumber);

      if (error) throw error;
    } catch (error: any) {
      console.error("VIDEO DELETE ERROR:", error);
      setAthleteVideosBySet(previousVideos);
      alert(error?.message || "Video verwijderen mislukt");
    }
  }

  function getAthleteExerciseNote(exerciseId: string) {
    return athleteNotesByExercise[exerciseId]?.notes || "";
  }

  function updateAthleteExerciseNoteLocal(exercise: ProgramExercise, value: string) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) return;

    setAthleteNotesByExercise((current) => ({
      ...current,
      [exercise.id]: {
        ...(current[exercise.id] || {
          program_exercise_id: exercise.id,
          athlete_id: ownerAthleteId,
        }),
        notes: value,
      },
    }));
  }

  async function saveAthleteExerciseNote(
    exercise: ProgramExercise,
    value: string,
  ) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden");
      return;
    }

    const noteRow = {
      program_exercise_id: exercise.id,
      athlete_id: ownerAthleteId,
      notes: value.trim(),
    };

    const previousNotes = athleteNotesByExercise;

    setAthleteNotesByExercise((current) => ({
      ...current,
      [exercise.id]: noteRow,
    }));

    try {
      await runSave(async () => {
        const { data: existingNote, error: findError } = await supabase
          .from("athlete_exercise_notes")
          .select("id")
          .eq("program_exercise_id", exercise.id)
          .eq("athlete_id", ownerAthleteId)
          .maybeSingle();

        if (findError) throw findError;

        if (existingNote?.id) {
          const { error: updateError } = await supabase
            .from("athlete_exercise_notes")
            .update({
              notes: noteRow.notes,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingNote.id);

          if (updateError) throw updateError;
          return;
        }

        const { error: insertError } = await supabase
          .from("athlete_exercise_notes")
          .insert(noteRow);

        if (insertError) throw insertError;
      });
    } catch {
      setAthleteNotesByExercise(previousNotes);
    }
  }

  function getSetCount(exercise: ProgramExercise) {
    const rawSets = (exercise.sets || "").trim();
    const match = rawSets.match(/\d+/);

    if (!match) return 1;

    const count = Number(match[0]);

    if (!Number.isFinite(count) || count < 1) return 1;
    if (count > 20) return 20;

    return count;
  }

  function getSelectedAthleteExercise() {
    for (const day of days) {
      const exercise = (exercisesByDay[day.id] || []).find(
        (item) => item.id === selectedAthleteExerciseId,
      );

      if (exercise) {
        return { day, exercise };
      }
    }

    return null;
  }

  function buildEmptySetRows(exercise: ProgramExercise) {
    return Array.from({ length: getSetCount(exercise) }, (_, index) => ({
      program_exercise_id: exercise.id,
      athlete_id: getOwnerAthleteId(),
      set_number: index + 1,
      reps: "",
      weight: "",
      rpe: "",
    }));
  }

  function getSetRowsForExercise(exercise: ProgramExercise) {
    const existingRows = athleteSetInputs[exercise.id] || [];
    const emptyRows = buildEmptySetRows(exercise);

    return emptyRows.map((emptyRow) => {
      const existingRow = existingRows.find(
        (item) => item.set_number === emptyRow.set_number,
      );

      return existingRow || emptyRow;
    });
  }

  async function openAthleteExercisePanel(exerciseId: string) {
    resetPreviousWeekData();
    setAthleteNotePanelOpen(false);
    setSelectedAthleteExerciseId(exerciseId);
    setAthleteExercisePanelOpen(true);
    await loadAthleteExerciseSets(exerciseId);
  }

  async function loadAthleteExerciseSets(exerciseId: string) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) return;

    setLoadingAthleteSets(true);

    const { data, error } = await supabase
      .from("athlete_exercise_sets")
      .select("*")
      .eq("program_exercise_id", exerciseId)
      .eq("athlete_id", ownerAthleteId)
      .order("set_number", { ascending: true });

    setLoadingAthleteSets(false);

    if (error) {
      alert(error.message);
      return;
    }

    setAthleteSetInputs((current) => ({
      ...current,
      [exerciseId]: data || [],
    }));
  }

  function updateAthleteSetLocal(
    exercise: ProgramExercise,
    setNumber: number,
    field: "reps" | "weight" | "rpe",
    value: string,
  ) {
    const currentRows = getSetRowsForExercise(exercise);

    setAthleteSetInputs((current) => ({
      ...current,
      [exercise.id]: currentRows.map((row) =>
        row.set_number === setNumber
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    }));
  }

  async function saveAthleteSetField(
    exercise: ProgramExercise,
    setNumber: number,
    field: "reps" | "weight" | "rpe",
    value: string,
  ) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden");
      return;
    }

    const currentRows = getSetRowsForExercise(exercise);
    const currentRow = currentRows.find((row) => row.set_number === setNumber);

    const nextRow = {
      program_exercise_id: exercise.id,
      athlete_id: ownerAthleteId,
      set_number: setNumber,
      reps: currentRow?.reps || "",
      weight: currentRow?.weight || "",
      rpe: currentRow?.rpe || "",
      [field]: value,
    };

    const previousInputs = athleteSetInputs;

    setAthleteSetInputs((current) => ({
      ...current,
      [exercise.id]: getSetRowsForExercise(exercise).map((row) =>
        row.set_number === setNumber
          ? {
              ...row,
              ...nextRow,
            }
          : row,
      ),
    }));

    try {
      await runSave(async () => {
        const { error } = await supabase
          .from("athlete_exercise_sets")
          .upsert(nextRow, {
            onConflict: "program_exercise_id,athlete_id,set_number",
          });

        if (error) throw error;
      });
    } catch {
      setAthleteSetInputs(previousInputs);
    }
  }

  async function copyAthleteSetToNextRow(
    exercise: ProgramExercise,
    row: AthleteExerciseSet,
  ) {
    const ownerAthleteId = getOwnerAthleteId();
    const nextSetNumber = row.set_number + 1;
    const rows = getSetRowsForExercise(exercise);
    const nextRowExists = rows.some(
      (item) => item.set_number === nextSetNumber,
    );

    if (!ownerAthleteId || !nextRowExists) return;

    const copiedRow = {
      program_exercise_id: exercise.id,
      athlete_id: ownerAthleteId,
      set_number: nextSetNumber,
      reps: row.reps || "",
      weight: row.weight || "",
      rpe: row.rpe || "",
    };

    const previousInputs = athleteSetInputs;

    setAthleteSetInputs((current) => ({
      ...current,
      [exercise.id]: rows.map((item) =>
        item.set_number === nextSetNumber
          ? {
              ...item,
              ...copiedRow,
            }
          : item,
      ),
    }));

    try {
      await runSave(async () => {
        const { error } = await supabase
          .from("athlete_exercise_sets")
          .upsert(copiedRow, {
            onConflict: "program_exercise_id,athlete_id,set_number",
          });

        if (error) throw error;
      });
    } catch {
      setAthleteSetInputs(previousInputs);
    }
  }

  async function handleAthleteSetArrowNavigation(
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    const target = e.currentTarget;
    const panel = target.closest("[data-athlete-set-panel='true']");

    if (!panel) return;

    if (e.key === "Enter") {
      e.preventDefault();

      const selected = getSelectedAthleteExercise();
      const setNumber = Number(target.dataset.setNumber || "0");
      const field = target.dataset.athleteField as
        | "reps"
        | "weight"
        | "rpe"
        | undefined;

      if (selected && setNumber > 0 && field) {
        await saveAthleteSetField(
          selected.exercise,
          setNumber,
          field,
          target.value,
        );
      }

      setAthleteExercisePanelOpen(false);
      setSelectedAthleteExerciseId("");
      setAthleteNotePanelOpen(false);
      return;
    }

    const fields = Array.from(
      panel.querySelectorAll<HTMLInputElement>(
        "input[data-athlete-set-input='true']",
      ),
    );
    const currentIndex = fields.indexOf(target);

    if (currentIndex === -1) return;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextField = fields[currentIndex + 1];

      if (nextField) {
        nextField.focus();
        nextField.select();
      }
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const previousField = fields[currentIndex - 1];

      if (previousField) {
        previousField.focus();
        previousField.select();
      }
    }
  }


  function renderAthleteDayCheckin(day: ProgramDay) {
    if (role !== "atleet") return null;

    const checkin = getAthleteDayCheckin(day.id);
    const options = [0, 2, 4, 6];
    const dayIsPast = isDayPast(getDayDateObject(day.day_number));
    const bwOverdue = dayIsPast && isEmptyCheckinBw(checkin.bw);
    const recoveryOverdue =
      dayIsPast && isEmptyCheckinRecovery(checkin.recovery);
    const fatigueOverdue = dayIsPast && isEmptyCheckinFatigue(checkin.fatigue);

    return (
      <div className="mb-0.5 rounded-xl border border-gray-200 bg-gray-50 p-2.5 shadow-sm">
        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-gray-400">
          Athlete check-in
        </p>

        <div className="grid grid-cols-[52px_1fr_1fr_44px] gap-1.5 items-end md:grid-cols-[58px_1fr_1fr_52px] md:gap-2">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
              BW
            </p>

            <input
              value={checkin.bw || ""}
              onChange={(e) => {
                updateAthleteDayCheckinLocal(day.id, {
                  bw: e.target.value,
                });
              }}
              onBlur={(e) =>
                saveAthleteDayCheckin(day.id, {
                  bw: e.target.value.trim(),
                })
              }
              placeholder="BW"
              inputMode="decimal"
              className={withOverdueInputClass(
                "w-full h-[38px] rounded-xl border border-gray-200 bg-white px-1.5 text-base font-bold text-black outline-none focus:border-black md:text-[11px]",
                bwOverdue,
              )}
            />
          </div>

          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
              Herstel
            </p>

            <div
              className={`flex h-[38px] gap-0.5 md:gap-1 ${
                recoveryOverdue ? OVERDUE_BUTTON_GROUP_CLASS : ""
              }`}
            >
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    saveAthleteDayCheckin(day.id, {
                      recovery: option,
                    })
                  }
                  className={`flex flex-1 items-center justify-center rounded-xl text-xs font-black transition md:text-sm ${
                    checkin.recovery === option
                      ? "bg-emerald-600 text-white"
                      : recoveryOverdue
                        ? "bg-red-50 text-red-800 hover:bg-red-100 border border-red-300"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
              Fatigue
            </p>

            <div
              className={`flex h-[38px] gap-0.5 md:gap-1 ${
                fatigueOverdue ? OVERDUE_BUTTON_GROUP_CLASS : ""
              }`}
            >
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    saveAthleteDayCheckin(day.id, {
                      fatigue: option,
                    })
                  }
                  className={`flex flex-1 items-center justify-center rounded-xl text-xs font-black transition md:text-sm ${
                    checkin.fatigue === option
                      ? "bg-orange-600 text-white"
                      : fatigueOverdue
                        ? "bg-red-50 text-red-800 hover:bg-red-100 border border-red-300"
                        : "bg-orange-50 text-orange-800 hover:bg-orange-100"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
              Note
            </p>

            <button
              type="button"
              onClick={() =>
                setOpenAthleteDayNotesId((current) =>
                  current === day.id ? "" : day.id,
                )
              }
              className={`flex h-[38px] w-full items-center justify-center rounded-xl px-1 text-[10px] font-black transition md:w-[44px] ${
                checkin.notes?.trim()
                  ? "bg-yellow-100 text-yellow-900"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Note
            </button>
          </div>
        </div>

        {openAthleteDayNotesId === day.id && (
          <textarea
            value={checkin.notes || ""}
            onChange={(e) =>
              updateAthleteDayCheckinLocal(day.id, {
                notes: e.target.value,
              })
            }
            onBlur={(e) =>
              saveAthleteDayCheckin(day.id, {
                notes: e.target.value,
              })
            }
            placeholder="Notes over deze dag..."
            className="mt-3 min-h-[80px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-base text-black outline-none focus:border-black md:text-sm"
          />
        )}
      </div>
    );
  }

  function getPlannedNumber(value: string | null | undefined) {
    if (!value) return 0;

    const match = value.toString().replace(",", ".").match(/\d+(\.\d+)?/);
    if (!match) return 0;

    const numberValue = Number(match[0]);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  function getShortSbdWeekSummary() {
    const summary = {
      squat: { label: "SQ", sets: 0, reps: 0 },
      bench: { label: "BP", sets: 0, reps: 0 },
      deadlift: { label: "DL", sets: 0, reps: 0 },
    };

    Object.values(exercisesByDay)
      .flat()
      .forEach((exercise) => {
        const cleanName = (exercise.name || "").toLowerCase();
        const sets = getPlannedNumber(exercise.sets);
        const repsPerSet = getPlannedNumber(exercise.reps);
        const totalReps = sets * repsPerSet;

        if (cleanName.includes("squat")) {
          summary.squat.sets += sets;
          summary.squat.reps += totalReps;
        } else if (cleanName.includes("bench")) {
          summary.bench.sets += sets;
          summary.bench.reps += totalReps;
        } else if (cleanName.includes("deadlift")) {
          summary.deadlift.sets += sets;
          summary.deadlift.reps += totalReps;
        }
      });

    return [summary.squat, summary.bench, summary.deadlift];
  }

  return (
    <div
      className={
        embeddedInChat
          ? "h-full min-h-0 bg-gray-100"
          : "relative min-h-[100dvh] bg-gray-100 supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)] lg:flex lg:min-h-screen"
      }
    >
      {!embeddedInChat && <AppSidebar />}
      {!embeddedInChat && renderBlocksSidebar()}

      <main
        className={
          embeddedInChat
            ? "h-full min-h-0 min-w-0 overflow-y-auto"
            : "relative min-w-0 flex-1"
        }
      >
      {!embeddedInChat && (
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[999] lg:bottom-5 lg:right-5">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg text-base font-black transition-all duration-200 ${
            saveState === "saved"
              ? "bg-green-500 text-white"
              : saveState === "saving"
                ? "bg-yellow-400 text-black"
                : "bg-red-500 text-white"
          }`}
          title={
            saveState === "saved"
              ? "Opgeslagen"
              : saveState === "saving"
                ? "Opslaan..."
                : "Niet opgeslagen"
          }
        >
          {saveState === "saved" && "✓"}
          {saveState === "saving" && "…"}
          {saveState === "error" && "✕"}
        </div>
      </div>
      )}

      {!embeddedInChat && (
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-[998] hidden rounded-2xl border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur lg:block lg:top-4 lg:right-4">
        <div className="flex items-center gap-3">
          {getShortSbdWeekSummary().map((item) => (
            <div key={item.label} className="text-center leading-tight">
              <p className="text-[10px] font-black text-gray-400">{item.label}</p>
              <p className="text-[11px] font-black text-black">
                {item.sets}s / {item.reps}r
              </p>
            </div>
          ))}
        </div>
      </div>
      )}

      {(isPending || navigatingUrl) && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 overflow-hidden">
          <div className="h-full w-1/3 bg-black animate-[loadingbar_0.9s_ease-in-out_infinite]" />
        </div>
      )}
      <section
        className={`min-w-0 overflow-hidden transition-opacity duration-200 ${
          embeddedInChat ? "p-2 pb-4" : "p-3 pb-16 lg:p-8 lg:pb-8"
        } ${navigatingUrl ? "pointer-events-none opacity-60" : "opacity-100"}`}
      >
          {role === "atleet" ? (
            <div className="max-w-full">
              {!embeddedInChat && renderBlockWeekNav()}

              <div className="mb-0 hidden lg:mb-8 lg:block">
                <h1 className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-3xl font-bold text-black">
                    {currentBlock?.title || "Block"}
                  </span>
                  <span className="text-2xl font-bold text-gray-400">
                    {week?.title || "Week"}
                  </span>
                </h1>
              </div>

              <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 pl-1 pr-3 [-webkit-overflow-scrolling:touch] lg:mx-0 lg:snap-none lg:items-start lg:gap-5 lg:px-0">
                {days.map((day) => {
                  const exercises = exercisesByDay[day.id] || [];
                  const athleteCheckin = renderAthleteDayCheckin(day);

                  return (
                    <div
                      key={day.id}
                      className="flex w-[calc(100vw-1.5rem)] max-w-[520px] flex-shrink-0 snap-center flex-col gap-0.5 lg:w-[520px] lg:min-w-[520px]"
                    >
                      {athleteCheckin}

                      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow md:p-5">
                        <div className="mb-3 md:mb-4">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <h2 className="text-xl font-bold text-black md:text-2xl">{day.title}</h2>
                            <p className="text-sm text-gray-500">{getDayDate(day.day_number)}</p>
                          </div>
                        </div>

                        {(day.warmup?.trim() || day.notes?.trim()) && (
                          <div className="flex flex-col gap-3 mb-5">
                            {day.warmup?.trim() && (
                              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                <p className="text-[10px] font-bold text-blue-700 mb-1">
                                  WARMUP
                                </p>
                                <p className="text-sm text-blue-950 whitespace-pre-wrap">
                                  {day.warmup}
                                </p>
                              </div>
                            )}

                            {day.notes?.trim() && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                                <p className="text-[10px] font-bold text-yellow-700 mb-1">
                                  COACH NOTES
                                </p>
                                <p className="text-sm text-yellow-900 whitespace-pre-wrap">
                                  {day.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {exercises.length === 0 ? (
                          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
                            Geen oefeningen voor deze dag.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {exercises.map((exercise) => {
                              return (
                                <div
                                  key={exercise.id}
                                  className={`w-full border rounded-xl p-3 transition ${getExerciseColorClass(
                                    exercise.name,
                                  )} ${
                                    selectedAthleteExerciseId === exercise.id &&
                                    athleteExercisePanelOpen
                                      ? "ring-2 ring-black/20"
                                      : ""
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAthleteExercisePanel(exercise.id)
                                    }
                                    className="w-full text-left"
                                  >
                                    <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-start">
                                      <div className="flex-1 min-w-0 pr-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <h3
                                            className="font-bold text-base text-black min-w-0 break-words whitespace-normal leading-tight"
                                            title={capitalizeExerciseName(exercise.name) || "Oefening"}
                                          >
                                            {capitalizeExerciseName(exercise.name) || "Oefening"}
                                          </h3>

                                          {isPriorityExercise(exercise.name) &&
                                            getExercisePriorityLabel(exercise) && (
                                            <span
                                              className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${getExercisePriorityClass(
                                                exercise,
                                              )}`}
                                            >
                                              {getExercisePriorityLabel(exercise)}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-1 text-sm shrink-0">
                                        <div className="w-[40px] text-center bg-white border border-gray-200 rounded-md px-1 py-1">
                                          <p className="text-[7px] font-bold text-gray-400 leading-none mb-1">
                                            SETS
                                          </p>
                                          <p className="font-semibold text-[11px] text-black truncate">
                                            {exercise.sets || "-"}
                                          </p>
                                        </div>

                                        <div className="w-[42px] text-center bg-white border border-gray-200 rounded-md px-1 py-1">
                                          <p className="text-[7px] font-bold text-gray-400 leading-none mb-1">
                                            REPS
                                          </p>
                                          <p className="font-semibold text-[11px] text-black truncate">
                                            {exercise.reps || "-"}
                                          </p>
                                        </div>

                                        <div className="w-[48px] text-center bg-white border border-gray-200 rounded-md px-1 py-1">
                                          <p className="text-[7px] font-bold text-gray-400 leading-none mb-1">
                                            INT
                                          </p>
                                          <p className="font-semibold text-[11px] text-black truncate">
                                            {getDisplayIntensity(exercise)}
                                          </p>
                                        </div>

                                        <div className="w-[42px] text-center bg-gray-50 border border-dashed border-gray-300 rounded-md px-1 py-1">
                                          <p className="text-[7px] font-bold text-gray-400 leading-none mb-1">
                                            KG
                                          </p>
                                          <p className="font-semibold text-[11px] text-gray-500 truncate">
                                            {getAthleteSetAverage(
                                              exercise,
                                              "weight",
                                            )}
                                          </p>
                                        </div>

                                        <div className="w-[42px] text-center bg-gray-50 border border-dashed border-gray-300 rounded-md px-1 py-1">
                                          <p className="text-[7px] font-bold text-gray-400 leading-none mb-1">
                                            REPS
                                          </p>
                                          <p className="font-semibold text-[11px] text-gray-500 truncate">
                                            {getAthleteSetAverage(
                                              exercise,
                                              "reps",
                                            )}
                                          </p>
                                        </div>

                                        <div className="w-[48px] text-center bg-gray-50 border border-dashed border-gray-300 rounded-md px-1 py-1">
                                          <p className="text-[7px] font-bold text-gray-400 leading-none mb-1">
                                            isRPE
                                          </p>
                                          <p className="font-semibold text-[11px] text-gray-500 truncate">
                                            {getAthleteSetAverage(
                                              exercise,
                                              "rpe",
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {exercise.notes?.trim() && (
                                      <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-2">
                                        <p className="text-[9px] font-bold text-yellow-700 mb-1">
                                          COACH NOTES
                                        </p>
                                        <p className="text-xs text-yellow-900 whitespace-pre-wrap">
                                          {exercise.notes}
                                        </p>
                                      </div>
                                    )}

                                    {getAthleteExerciseNote(
                                      exercise.id,
                                    ).trim() && (
                                      <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-2">
                                        <p className="text-[9px] font-bold text-green-700 mb-1">
                                          ATHLETE NOTES
                                        </p>
                                        <p className="text-xs text-green-900 whitespace-pre-wrap">
                                          {getAthleteExerciseNote(exercise.id)}
                                        </p>
                                      </div>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-full">
              {!embeddedInChat && (
              <div className="mb-4 hidden flex-col gap-3 lg:mb-8 lg:flex lg:flex-row lg:items-center lg:justify-between lg:pr-44">
                <div className="min-w-0">
                  <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-2xl font-bold text-black md:text-3xl">
                      {currentBlock?.title || "Block"}
                    </span>
                    <span className="text-xl font-bold text-gray-400 md:text-2xl">
                      {week?.title || "Week"}
                    </span>
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    goToUrl(
                      athleteId
                        ? `/programs?athlete=${athleteId}`
                        : "/programs",
                    )
                  }
                  className="w-full shrink-0 rounded-xl bg-black px-4 py-2.5 text-sm text-white sm:w-auto"
                >
                  Terug
                </button>
              </div>
              )}

              {!embeddedInChat && renderBlockWeekNav()}

              <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 pl-1 pr-3 [-webkit-overflow-scrolling:touch] lg:mx-0 lg:snap-none lg:gap-4 lg:px-0">
                {days.map((day) => {
                  const exercises = exercisesByDay[day.id] || [];
                  const isAddingExercise = creatingExerciseDayId === day.id;
                  const dayHasExercises = hasExercises(day.id);
                  const noteOpen = openDayNoteId === day.id;
                  const warmupOpen = openDayWarmupId === day.id;

                  return (
                    <div
                      key={day.id}
                      draggable={role === "coach"}
                      onDragStart={() => handleDragStart(day.id)}
                      onDragOver={(e) => handleDragOver(e, day.id)}
                      onDrop={(e) => e.preventDefault()}
                      onDragEnd={saveDayOrder}
                      className={`group flex w-[min(360px,calc(100vw-1.5rem))] min-w-[min(360px,calc(100vw-1.5rem))] flex-shrink-0 snap-center flex-col rounded-2xl border-2 border-gray-200 bg-white p-3 text-black shadow transform-gpu transition-all duration-300 ease-out hover:border-black lg:w-[360px] lg:min-w-[360px] lg:p-4 ${
                        role === "coach"
                          ? "cursor-grab active:cursor-grabbing"
                          : ""
                      } ${
                        draggedDayId === day.id
                          ? "opacity-60 scale-[0.96] rotate-1 shadow-2xl"
                          : "opacity-100 scale-100 rotate-0"
                      } ${
                        dragOverDayId === day.id && draggedDayId !== day.id
                          ? "scale-[1.03] border-black shadow-xl"
                          : ""
                      } ${
                        dayHasExercises ||
                        isAddingExercise ||
                        noteOpen ||
                        warmupOpen
                          ? "min-h-[420px]"
                          : "min-h-[230px]"
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-2">
                            {role === "coach" && !day.warmup?.trim() && (
                              <button
                                type="button"
                                onClick={() => setOpenDayWarmupId(day.id)}
                                className="px-3 py-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-bold transition"
                              >
                                Warmup
                              </button>
                            )}

                            {role === "coach" && !day.notes?.trim() && (
                              <button
                                type="button"
                                onClick={() => setOpenDayNoteId(day.id)}
                                className="px-3 py-2 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-900 text-xs font-bold transition"
                              >
                                Coach notes
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {role === "coach" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => duplicateDay(day)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition bg-gray-200 hover:bg-black hover:text-white text-gray-600"
                                  title="Dag dupliceren"
                                >
                                  ⧉
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deleteDay(day.id)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition bg-gray-200 hover:bg-red-500 hover:text-white text-gray-600"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {renderAthleteDayCheckin(day)}

                        {day.warmup?.trim() && !warmupOpen && (
                          <div className="relative mb-3">
                            <button
                              type="button"
                              onClick={() =>
                                role === "coach" && setOpenDayWarmupId(day.id)
                              }
                              className="w-full text-left bg-blue-50 border border-blue-200 rounded-xl p-3 pr-8 transition hover:bg-blue-100"
                            >
                              <p className="text-[10px] font-bold text-blue-700 mb-1">
                                WARMUP
                              </p>

                              <p className="text-sm text-blue-950 whitespace-pre-wrap">
                                {day.warmup}
                              </p>
                            </button>

                            {role === "coach" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteDayField(day.id, "warmup");
                                }}
                                className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-200 hover:bg-red-500 hover:text-white text-blue-900 text-[9px] flex items-center justify-center transition"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )}

                        {warmupOpen && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                            <p className="text-[10px] font-bold text-blue-700 mb-2">
                              WARMUP
                            </p>

                            <textarea
                              value={day.warmup || ""}
                              onChange={(e) =>
                                updateDayLocal(day.id, "warmup", e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  saveDayField(
                                    day.id,
                                    "warmup",
                                    day.warmup || "",
                                  );
                                }
                              }}
                              placeholder="Schrijf warmup..."
                              className="w-full min-h-[80px] resize-none border border-blue-200 bg-white rounded-xl px-3 py-2 text-sm text-black placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-300"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                saveDayField(day.id, "warmup", day.warmup || "")
                              }
                              className="mt-2 w-full bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-bold"
                            >
                              Toevoegen
                            </button>
                          </div>
                        )}

                        {day.notes?.trim() && !noteOpen && (
                          <div className="relative mb-4">
                            <button
                              type="button"
                              onClick={() =>
                                role === "coach" && setOpenDayNoteId(day.id)
                              }
                              className="w-full text-left bg-yellow-50 border border-yellow-200 rounded-xl p-3 pr-8 transition hover:bg-yellow-100"
                            >
                              <p className="text-[10px] font-bold text-yellow-700 mb-1">
                                COACH NOTES
                              </p>

                              <p className="text-sm text-yellow-900 whitespace-pre-wrap">
                                {day.notes}
                              </p>
                            </button>

                            {role === "coach" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteDayField(day.id, "notes");
                                }}
                                className="absolute top-2 right-2 w-4 h-4 rounded-full bg-yellow-200 hover:bg-red-500 hover:text-white text-yellow-900 text-[9px] flex items-center justify-center transition"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )}

                        {noteOpen && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                            <p className="text-[10px] font-bold text-yellow-700 mb-2">
                              COACH NOTES
                            </p>

                            <textarea
                              value={day.notes || ""}
                              onChange={(e) =>
                                updateDayLocal(day.id, "notes", e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  saveDayField(
                                    day.id,
                                    "notes",
                                    day.notes || "",
                                  );
                                }
                              }}
                              placeholder="Schrijf coach notes..."
                              className="w-full min-h-[80px] resize-none border border-yellow-200 bg-white rounded-xl px-3 py-2 text-sm text-black placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-yellow-300"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                saveDayField(day.id, "notes", day.notes || "")
                              }
                              className="mt-2 w-full bg-yellow-400 text-yellow-950 px-3 py-2 rounded-xl text-sm font-bold"
                            >
                              Toevoegen
                            </button>
                          </div>
                        )}

                        <div className="mb-4 flex items-baseline gap-2">
                          <h2 className="text-3xl font-bold">{day.title}</h2>
                          <p className="text-sm text-gray-500">{getDayDate(day.day_number)}</p>
                        </div>

                        {dayHasExercises && (
                          <div className="space-y-1.5 mt-1.5">
                            {exercises.map((exercise) => {
                              const intensityType = getIntensityType(exercise);
                              const exerciseNoteOpen =
                                openExerciseNoteId === exercise.id;

                              return (
                                <div
                                  key={exercise.id}
                                  draggable={role === "coach"}
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    handleExerciseDragStart(
                                      day.id,
                                      exercise.id,
                                    );
                                  }}
                                  onDragOver={(e) =>
                                    handleExerciseDragOver(
                                      e,
                                      day.id,
                                      exercise.id,
                                    )
                                  }
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDragEnd={() => saveExerciseOrder(day.id)}
                                  className={`group/exercise relative rounded-lg px-4 py-1.5 ${getCoachExerciseColorClass(
                                    exercise.name,
                                  )} transition-all duration-200 ${
                                    role === "coach"
                                      ? "cursor-grab active:cursor-grabbing"
                                      : ""
                                  } ${
                                    draggedExercise?.exerciseId === exercise.id
                                      ? "opacity-60 scale-[0.98]"
                                      : "opacity-100 scale-100"
                                  } ${
                                    dragOverExerciseId === exercise.id &&
                                    draggedExercise?.exerciseId !== exercise.id
                                      ? "ring-2 ring-black"
                                      : ""
                                  }`}
                                >
                                  {role === "coach" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          deleteExercise(exercise.id)
                                        }
                                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white text-[9px] flex items-center justify-center opacity-0 group-hover/exercise:opacity-100 transition"
                                      >
                                        ✕
                                      </button>
                                    </>
                                  )}

                                  <div className="flex flex-wrap items-center gap-1.5 pr-6">
                                    <textarea
                                      value={capitalizeExerciseName(exercise.name) || ""}
                                      onChange={(e) =>
                                        updateExerciseLocal(
                                          day.id,
                                          exercise.id,
                                          "name",
                                          e.target.value,
                                        )
                                      }
                                      onBlur={(e) =>
                                        saveExerciseField(
                                          exercise.id,
                                          "name",
                                          e.target.value,
                                        )
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault();
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      disabled={role !== "coach"}
                                      rows={1}
                                      className="min-h-[24px] flex-1 resize-none overflow-hidden bg-transparent px-1 font-bold text-[13px] leading-tight outline-none text-black break-words whitespace-normal"
                                    />

                                    {role === "coach" &&
                                      isPriorityExercise(exercise.name) && (
                                        <select
                                          value={exercise.priority || ""}
                                          onChange={(e) =>
                                            saveExercisePriority(
                                              exercise.id,
                                              e.target.value,
                                            )
                                          }
                                          onClick={(e) => e.stopPropagation()}
                                          style={{
                                            width: `${Math.max(
                                              54,
                                              (getExercisePriorityLabel(exercise) || "—").length *
                                                5.2 +
                                                18,
                                            )}px`,
                                          }}
                                          className={`h-[21px] shrink-0 rounded-full border px-1 py-0 text-[10px] font-bold leading-none outline-none ${getExercisePriorityClass(
                                            exercise,
                                          )}`}
                                        >
                                          <option value="">—</option>
                                          {priorityOptions.map((priority) => (
                                            <option
                                              key={priority}
                                              value={priority}
                                            >
                                              {getExercisePriorityLabel({
                                                ...exercise,
                                                priority,
                                              })}
                                            </option>
                                          ))}
                                        </select>
                                      )}

                                    {role === "coach" && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setOpenExerciseNoteId(
                                            exerciseNoteOpen ? "" : exercise.id,
                                          );
                                        }}
                                        className="h-[22px] shrink-0 rounded-full border border-yellow-200 bg-yellow-50 px-1.5 py-0 text-[10px] font-bold leading-none text-yellow-900 hover:bg-yellow-100"
                                      >
                                        Notes
                                      </button>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-4 gap-1 mt-1">
                                    <div>
                                      <p className="text-[8px] font-bold mb-0.5 text-gray-500">
                                        SETS
                                      </p>

                                      <input
                                        value={exercise.sets || ""}
                                        onChange={(e) =>
                                          updateExerciseLocal(
                                            day.id,
                                            exercise.id,
                                            "sets",
                                            e.target.value,
                                          )
                                        }
                                        onBlur={(e) =>
                                          saveExerciseField(
                                            exercise.id,
                                            "sets",
                                            e.target.value,
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.currentTarget.blur();
                                          }
                                        }}
                                        disabled={role !== "coach"}
                                        className="h-7 w-full border rounded-md px-1 py-0 text-center text-xs outline-none bg-white border-gray-300 text-black"
                                      />
                                    </div>

                                    <div>
                                      <p className="text-[8px] font-bold mb-0.5 text-gray-500">
                                        REPS
                                      </p>

                                      <input
                                        value={exercise.reps || ""}
                                        onChange={(e) =>
                                          updateExerciseLocal(
                                            day.id,
                                            exercise.id,
                                            "reps",
                                            e.target.value,
                                          )
                                        }
                                        onBlur={(e) =>
                                          saveExerciseField(
                                            exercise.id,
                                            "reps",
                                            e.target.value,
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.currentTarget.blur();
                                          }
                                        }}
                                        disabled={role !== "coach"}
                                        className="h-7 w-full border rounded-md px-1 py-0 text-center text-xs outline-none bg-white border-gray-300 text-black"
                                      />
                                    </div>

                                    <div>
                                      <p className="text-[8px] font-bold mb-0.5 text-gray-500">
                                        INT.
                                      </p>

                                      <input
                                        value={getIntensityValue(exercise)}
                                        onChange={(e) => {
                                          const value = e.target.value;

                                          if (intensityType === "rpe") {
                                            updateExerciseLocal(
                                              day.id,
                                              exercise.id,
                                              "rpe",
                                              value,
                                            );

                                            updateExerciseLocal(
                                              day.id,
                                              exercise.id,
                                              "load",
                                              "",
                                            );
                                          } else {
                                            updateExerciseLocal(
                                              day.id,
                                              exercise.id,
                                              "load",
                                              value,
                                            );

                                            updateExerciseLocal(
                                              day.id,
                                              exercise.id,
                                              "rpe",
                                              "",
                                            );
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const value = e.target.value.trim();

                                          if (intensityType === "rpe") {
                                            saveExerciseFields(exercise.id, {
                                              rpe: value,
                                              load: "",
                                            });
                                          } else {
                                            saveExerciseFields(exercise.id, {
                                              load: value
                                                ? `${value}${intensityType}`
                                                : "",
                                              rpe: "",
                                            });
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.currentTarget.blur();
                                          }
                                        }}
                                        disabled={role !== "coach"}
                                        className="h-7 w-full border rounded-md px-1 py-0 text-center text-xs outline-none bg-white border-gray-300 text-black"
                                      />
                                    </div>

                                    <div>
                                      <p className="text-[8px] font-bold mb-0.5 text-gray-500">
                                        TYPE
                                      </p>

                                      <select
                                        value={intensityType}
                                        onChange={(e) =>
                                          updateIntensityType(
                                            day.id,
                                            exercise,
                                            e.target.value,
                                          )
                                        }
                                        disabled={role !== "coach"}
                                        className="h-7 w-full border rounded-md px-1 py-0 text-xs outline-none bg-white border-gray-300 text-black"
                                      >
                                        <option value="%">%</option>
                                        <option value="rpe">RPE</option>
                                        <option value="kg">KG</option>
                                      </select>
                                    </div>
                                  </div>

                                  {exercise.notes?.trim() &&
                                    !exerciseNoteOpen && (
                                      <div className="relative mt-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            role === "coach" &&
                                            setOpenExerciseNoteId(exercise.id)
                                          }
                                          className="w-full text-left bg-yellow-50 border border-yellow-200 rounded-xl p-2 pr-7 transition hover:bg-yellow-100"
                                        >
                                          <p className="text-[9px] font-bold text-yellow-700 mb-1">
                                            COACH NOTES
                                          </p>

                                          <p className="text-xs text-yellow-900 whitespace-pre-wrap">
                                            {exercise.notes}
                                          </p>
                                        </button>

                                        {role === "coach" && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              deleteExerciseNote(
                                                day.id,
                                                exercise.id,
                                              );
                                            }}
                                            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-yellow-200 hover:bg-red-500 hover:text-white text-yellow-900 text-[9px] flex items-center justify-center transition"
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>
                                    )}

                                  {getAthleteExerciseNote(
                                    exercise.id,
                                  ).trim() && (
                                    <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-2">
                                      <p className="text-[9px] font-bold text-green-700 mb-1">
                                        ATHLETE NOTES
                                      </p>
                                      <p className="text-xs text-green-900 whitespace-pre-wrap">
                                        {getAthleteExerciseNote(exercise.id)}
                                      </p>
                                    </div>
                                  )}

                                  {exerciseNoteOpen && (
                                    <div className="relative mt-2 bg-yellow-50 border border-yellow-200 rounded-xl p-2 pt-6">
                                      {role === "coach" && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            deleteExerciseNote(
                                              day.id,
                                              exercise.id,
                                            );
                                          }}
                                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-yellow-200 hover:bg-red-500 hover:text-white text-yellow-900 text-[9px] flex items-center justify-center transition"
                                        >
                                          ✕
                                        </button>
                                      )}

                                      <textarea
                                        value={exercise.notes || ""}
                                        onChange={(e) =>
                                          updateExerciseLocal(
                                            day.id,
                                            exercise.id,
                                            "notes",
                                            e.target.value,
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" &&
                                            !e.shiftKey
                                          ) {
                                            e.preventDefault();
                                            saveExerciseField(
                                              exercise.id,
                                              "notes",
                                              exercise.notes || "",
                                            );
                                          }
                                        }}
                                        placeholder="Coach notes bij oefening..."
                                        className="w-full min-h-[65px] resize-none border border-yellow-200 bg-white rounded-xl px-3 py-2 text-xs text-black placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-yellow-300"
                                      />

                                      <button
                                        type="button"
                                        onClick={() =>
                                          saveExerciseField(
                                            exercise.id,
                                            "notes",
                                            exercise.notes || "",
                                          )
                                        }
                                        className="mt-2 w-full bg-yellow-400 text-yellow-950 px-3 py-2 rounded-xl text-xs font-bold"
                                      >
                                        Toevoegen
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-auto pt-5">
                          {role === "coach" && !isAddingExercise && (
                            <button
                              type="button"
                              onClick={() => {
                                setCreatingExerciseDayId(day.id);
                                setExerciseName("");
                                setExerciseSets("");
                                setExerciseReps("");
                                setExerciseIntensity("");
                                setExerciseIntensityType("rpe");
                              }}
                              className="w-full rounded-xl py-3 text-2xl font-light transition bg-gray-100 hover:bg-gray-200 text-black"
                            >
                              +
                            </button>
                          )}

                          {role === "coach" && isAddingExercise && (
                            <div
                              className="rounded-2xl p-3 bg-gray-100"
                              data-new-exercise-form="true"
                            >
                              <input
                                ref={exerciseNameInputRef}
                                value={exerciseName}
                                onChange={(e) =>
                                  setExerciseName(capitalizeExerciseName(e.target.value))
                                }
                                onKeyDown={(e) =>
                                  handleNewExerciseFormKeyDown(e, day.id)
                                }
                                placeholder="Naam oefening"
                                className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 text-sm text-black placeholder:text-gray-400 outline-none mb-3"
                              />

                              <div className="grid grid-cols-4 gap-2">
                                <input
                                  value={exerciseSets}
                                  onChange={(e) =>
                                    setExerciseSets(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleNewExerciseFormKeyDown(e, day.id)
                                  }
                                  placeholder="Sets"
                                  className="border border-gray-300 bg-white rounded-xl px-2 py-2 text-sm text-black placeholder:text-gray-400 outline-none"
                                />

                                <input
                                  value={exerciseReps}
                                  onChange={(e) =>
                                    setExerciseReps(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleNewExerciseFormKeyDown(e, day.id)
                                  }
                                  placeholder="Reps"
                                  className="border border-gray-300 bg-white rounded-xl px-2 py-2 text-sm text-black placeholder:text-gray-400 outline-none"
                                />

                                <input
                                  value={exerciseIntensity}
                                  onChange={(e) =>
                                    setExerciseIntensity(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleNewExerciseFormKeyDown(e, day.id)
                                  }
                                  placeholder="Int."
                                  className="border border-gray-300 bg-white rounded-xl px-2 py-2 text-sm text-black placeholder:text-gray-400 outline-none"
                                />

                                <select
                                  value={exerciseIntensityType}
                                  onChange={(e) =>
                                    setExerciseIntensityType(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleNewExerciseFormKeyDown(e, day.id)
                                  }
                                  className="border border-gray-300 bg-white rounded-xl px-2 py-2 text-sm text-black outline-none"
                                >
                                  <option value="%">%</option>
                                  <option value="rpe">RPE</option>
                                  <option value="kg">KG</option>
                                </select>
                              </div>

                              <div className="flex gap-2 mt-3">
                                <button
                                  type="button"
                                  onClick={() => addExercise(day.id)}
                                  className="flex-1 bg-black text-white px-3 py-2 rounded-xl text-sm"
                                >
                                  Opslaan
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setCreatingExerciseDayId("");
                                    setExerciseName("");
                                    setExerciseSets("");
                                    setExerciseReps("");
                                    setExerciseIntensity("");
                                    setExerciseIntensityType("rpe");
                                  }}
                                  className="flex-1 bg-white text-black px-3 py-2 rounded-xl text-sm"
                                >
                                  Annuleer
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {role === "coach" && !isCreatingDay && (
                  <button
                    onClick={() => setIsCreatingDay(true)}
                    className="bg-white rounded-2xl shadow border-2 border-dashed border-gray-300 min-h-[230px] w-[360px] min-w-[360px] flex flex-col items-center justify-center hover:border-black hover:bg-gray-50 transition"
                  >
                    <div className="text-6xl font-light mb-2">+</div>

                    <p className="text-gray-500">Nieuwe dag toevoegen</p>
                  </button>
                )}

                {role === "coach" && isCreatingDay && (
                  <div className="bg-white rounded-2xl shadow border-2 border-gray-200 min-h-[230px] w-[360px] min-w-[360px] p-4 flex flex-col justify-between">
                    <div>
                      <h2 className="text-xl font-bold mb-4">Nieuwe dag</h2>

                      <input
                        ref={newDayInputRef}
                        value={newDayTitle}
                        onChange={(e) => setNewDayTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            createDay(days.length + 1);
                          }
                        }}
                        placeholder="Bijvoorbeeld: Borst training"
                        className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>

                    <div className="flex gap-2 mt-5">
                      <button
                        onClick={() => createDay(days.length + 1)}
                        className="flex-1 bg-black text-white px-4 py-2 rounded-xl"
                      >
                        Opslaan
                      </button>

                      <button
                        onClick={() => {
                          setIsCreatingDay(false);
                          setNewDayTitle("");
                        }}
                        className="flex-1 bg-gray-100 px-4 py-2 rounded-xl"
                      >
                        Annuleer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
      </section>

      <style jsx global>{`
        @keyframes loadingbar {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(320%);
          }
        }

        @keyframes floatpanel {
          0% {
            opacity: 0;
            transform: translate(-50%, -46%) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes slidepanel {
          0% {
            transform: translateY(100%);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>

      {role === "atleet" &&
        athleteExercisePanelOpen &&
        (() => {
          const selected = getSelectedAthleteExercise();

          if (!selected) return null;

          const { day, exercise } = selected;
          const setRows = getSetRowsForExercise(exercise);
          const dayIsPast = isDayPast(getDayDateObject(day.day_number));

          return (
            <div className="fixed inset-0 z-40">
              <button
                type="button"
                aria-label="Sluit oefening invullen"
                onClick={() => {
                  setAthleteExercisePanelOpen(false);
                  setSelectedAthleteExerciseId("");
                  setAthleteNotePanelOpen(false);
                  resetPreviousWeekData();
                }}
                className="absolute inset-0 bg-black/45 backdrop-blur-[1px] cursor-default"
              />

              <section
                data-athlete-set-panel="true"
                className="absolute bottom-0 left-0 right-0 flex h-[min(78dvh,calc(100dvh-env(safe-area-inset-bottom)-0.5rem))] w-full animate-[slidepanel_0.22s_ease-out] flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-2xl lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:h-auto lg:max-h-[82vh] lg:w-[min(640px,calc(100vw-32px))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:animate-[floatpanel_0.18s_ease-out] lg:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto mb-3 mt-3 h-1 w-10 shrink-0 rounded-full bg-gray-300 lg:hidden" />

                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 pb-3 pt-0 md:gap-4 md:px-5 md:pb-4">
                  <div className="min-w-0 pr-2">
                    <p className="mb-1 text-xs text-gray-500 md:text-sm">
                      {day.title} · {getDayDate(day.day_number)}
                    </p>
                    <h2 className="text-xl font-bold leading-tight text-black md:text-2xl">
                      {capitalizeExerciseName(exercise.name) || "Oefening invullen"}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1 md:text-sm">
                      Voorgeschreven: {exercise.sets || "-"} sets ·{" "}
                      {exercise.reps || "-"} reps ·{" "}
                      {getDisplayIntensity(exercise)}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          previousWeekOpen
                            ? resetPreviousWeekData()
                            : loadPreviousWeekExerciseSets(day, exercise)
                        }
                        className="rounded-xl bg-black px-3 py-2 text-xs font-bold text-white hover:opacity-85 transition"
                      >
                        {previousWeekOpen
                          ? "Vorige week verbergen"
                          : "Bekijk vorige week"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAthleteExercisePanelOpen(false);
                      setSelectedAthleteExerciseId("");
                      setAthleteNotePanelOpen(false);
                      resetPreviousWeekData();
                    }}
                    className="flex h-11 w-11 min-w-11 items-center justify-center rounded-full border-2 border-black bg-white text-xl font-bold text-black shadow-md transition hover:bg-black hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-5">
                <div className="mb-4 pt-3">
                  <button
                    type="button"
                    onClick={() => setAthleteNotePanelOpen((open) => !open)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      athleteNotePanelOpen
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200 bg-gray-50 hover:border-green-300 hover:bg-green-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold text-green-700">
                          ATHLETE NOTES
                        </p>
                        <p className="text-sm text-gray-600">
                          {getAthleteExerciseNote(exercise.id).trim()
                            ? "Bekijk of bewerk je note bij deze oefening"
                            : "Voeg een note toe bij deze oefening"}
                        </p>
                      </div>

                      <span className="text-lg font-bold text-green-700">
                        {athleteNotePanelOpen ? "−" : "+"}
                      </span>
                    </div>
                  </button>

                  {athleteNotePanelOpen && (
                    <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 p-3">
                      <textarea
                        value={getAthleteExerciseNote(exercise.id)}
                        onChange={(e) =>
                          updateAthleteExerciseNoteLocal(
                            exercise,
                            e.target.value,
                          )
                        }
                        onBlur={(e) =>
                          saveAthleteExerciseNote(exercise, e.target.value)
                        }
                        placeholder="Schrijf hier je note bij deze oefening..."
                        className="w-full min-h-[70px] resize-none rounded-xl border border-green-200 bg-white px-3 py-2 text-base text-black placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-green-300 md:text-sm"
                      />
                    </div>
                  )}
                </div>

                {previousWeekOpen && (
                  <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                          Vorige week
                        </p>
                        <h3 className="text-sm font-bold text-black">
                          {previousWeekData
                            ? `${previousWeekData.weekTitle} · ${previousWeekData.dayTitle}`
                            : "Resultaat vorige week"}
                        </h3>
                      </div>

                      {previousWeekData && (
                        <div className="grid grid-cols-3 gap-1 text-center text-xs">
                          <div className="rounded-xl bg-white border border-gray-200 px-2 py-1">
                            <p className="text-[8px] font-bold text-gray-400">
                              REPS
                            </p>
                            <p className="font-bold">
                              {getAverageFromRows(
                                previousWeekData.rows,
                                "reps",
                              )}
                            </p>
                          </div>
                          <div className="rounded-xl bg-white border border-gray-200 px-2 py-1">
                            <p className="text-[8px] font-bold text-gray-400">
                              KG
                            </p>
                            <p className="font-bold">
                              {getAverageFromRows(
                                previousWeekData.rows,
                                "weight",
                              )}
                            </p>
                          </div>
                          <div className="rounded-xl bg-white border border-gray-200 px-2 py-1">
                            <p className="text-[8px] font-bold text-gray-400">
                              isRPE
                            </p>
                            <p className="font-bold">
                              {getAverageFromRows(previousWeekData.rows, "rpe")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {!loadingPreviousWeekSets &&
                      previousWeekData?.athleteNote?.trim() && (
                        <div className="mb-3 rounded-xl bg-green-50 border border-green-200 p-3">
                          <p className="text-[9px] font-bold text-green-700 mb-1">
                            ATHLETE NOTES VORIGE WEEK
                          </p>
                          <p className="text-sm text-green-900 whitespace-pre-wrap">
                            {previousWeekData.athleteNote}
                          </p>
                        </div>
                      )}

                    {loadingPreviousWeekSets && (
                      <p className="text-sm text-gray-500">
                        Vorige week laden...
                      </p>
                    )}

                    {!loadingPreviousWeekSets && previousWeekMessage && (
                      <p className="text-sm text-gray-500">
                        {previousWeekMessage}
                      </p>
                    )}

                    {!loadingPreviousWeekSets && previousWeekData && (
                      <div className="space-y-2">
                        {previousWeekData.rows.map((row) => (
                          <div
                            key={`previous-${row.program_exercise_id}-${row.set_number}`}
                            className="grid grid-cols-[52px_1fr_1fr_1fr] gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm"
                          >
                            <p className="font-bold">Set {row.set_number}</p>
                            <p>
                              Reps:{" "}
                              <span className="font-bold">
                                {row.reps || "-"}
                              </span>
                            </p>
                            <p>
                              KG:{" "}
                              <span className="font-bold">
                                {row.weight || "-"}
                              </span>
                            </p>
                            <p>
                              isRPE:{" "}
                              <span className="font-bold">
                                {row.rpe || "-"}
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {loadingAthleteSets ? (
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 text-sm text-gray-500">
                    Sets laden...
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[44px_48px_1fr_1fr_1fr_36px] gap-1.5 px-0.5 md:grid-cols-[52px_58px_1fr_1fr_1fr_42px] md:gap-2 md:px-1">
                      <p className="text-[10px] font-bold text-gray-400 text-center">
                        VIDEO
                      </p>
                      <p className="text-[10px] font-bold text-gray-400">SET</p>
                      <p className="text-[10px] font-bold text-gray-400">
                        REPS
                      </p>
                      <p className="text-[10px] font-bold text-gray-400">
                        GEWICHT
                      </p>
                      <p className="text-[10px] font-bold text-gray-400">
                        isRPE
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 text-center">
                        ↓
                      </p>
                    </div>

                    {setRows.map((row) => (
                      <div
                        key={`${exercise.id}-${row.set_number}`}
                        className="grid grid-cols-[44px_48px_1fr_1fr_1fr_36px] gap-1.5 items-center rounded-2xl bg-gray-50 border border-gray-200 p-1.5 md:grid-cols-[52px_58px_1fr_1fr_1fr_42px] md:gap-2 md:p-2"
                      >
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => openVideoRecorder(exercise, row.set_number)}
                            disabled={
                              uploadingVideoSetKey ===
                              getAthleteSetVideoKey(exercise.id, row.set_number)
                            }
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border text-base font-bold transition md:h-10 md:w-10 ${
                              getAthleteSetVideo(exercise.id, row.set_number)
                                ?.video_url
                                ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                                : "border-gray-300 bg-white text-black hover:bg-gray-100"
                            } ${
                              uploadingVideoSetKey ===
                              getAthleteSetVideoKey(exercise.id, row.set_number)
                                ? "cursor-wait opacity-60"
                                : ""
                            }`}
                            title={
                              getAthleteSetVideo(exercise.id, row.set_number)
                                ?.video_url
                                ? "Video vervangen"
                                : "Video toevoegen"
                            }
                          >
                            {uploadingVideoSetKey ===
                            getAthleteSetVideoKey(exercise.id, row.set_number)
                              ? "…"
                              : getAthleteSetVideo(exercise.id, row.set_number)
                                    ?.video_url
                                ? "▶"
                                : "+"}
                          </button>
                        </div>

                        <div className="font-bold text-black text-sm">
                          Set {row.set_number}
                        </div>

                        <input
                          data-athlete-set-input="true"
                          data-athlete-field="reps"
                          data-set-number={row.set_number}
                          value={row.reps || ""}
                          onChange={(e) =>
                            updateAthleteSetLocal(
                              exercise,
                              row.set_number,
                              "reps",
                              e.target.value,
                            )
                          }
                          onBlur={(e) =>
                            saveAthleteSetField(
                              exercise,
                              row.set_number,
                              "reps",
                              e.target.value,
                            )
                          }
                          onKeyDown={handleAthleteSetArrowNavigation}
                          placeholder="8"
                          inputMode="numeric"
                          className={withOverdueInputClass(
                            "w-full rounded-xl border border-gray-300 bg-white px-2 py-2 text-base text-black outline-none focus:ring-2 focus:ring-black md:px-3 md:text-sm",
                            dayIsPast && isEmptySetField(row.reps),
                          )}
                        />

                        <input
                          data-athlete-set-input="true"
                          data-athlete-field="weight"
                          data-set-number={row.set_number}
                          value={row.weight || ""}
                          onChange={(e) =>
                            updateAthleteSetLocal(
                              exercise,
                              row.set_number,
                              "weight",
                              e.target.value,
                            )
                          }
                          onBlur={(e) =>
                            saveAthleteSetField(
                              exercise,
                              row.set_number,
                              "weight",
                              e.target.value,
                            )
                          }
                          onKeyDown={handleAthleteSetArrowNavigation}
                          placeholder="100"
                          inputMode="decimal"
                          className={withOverdueInputClass(
                            "w-full rounded-xl border border-gray-300 bg-white px-2 py-2 text-base text-black outline-none focus:ring-2 focus:ring-black md:px-3 md:text-sm",
                            dayIsPast && isEmptySetField(row.weight),
                          )}
                        />

                        <input
                          data-athlete-set-input="true"
                          data-athlete-field="rpe"
                          data-set-number={row.set_number}
                          value={row.rpe || ""}
                          onChange={(e) =>
                            updateAthleteSetLocal(
                              exercise,
                              row.set_number,
                              "rpe",
                              e.target.value,
                            )
                          }
                          onBlur={(e) =>
                            saveAthleteSetField(
                              exercise,
                              row.set_number,
                              "rpe",
                              e.target.value,
                            )
                          }
                          onKeyDown={handleAthleteSetArrowNavigation}
                          placeholder="8"
                          inputMode="decimal"
                          className={withOverdueInputClass(
                            "w-full rounded-xl border border-gray-300 bg-white px-2 py-2 text-base text-black outline-none focus:ring-2 focus:ring-black md:px-3 md:text-sm",
                            dayIsPast && isEmptySetField(row.rpe),
                          )}
                        />

                        <button
                          type="button"
                          onClick={() => copyAthleteSetToNextRow(exercise, row)}
                          disabled={row.set_number >= setRows.length}
                          className={`h-9 rounded-xl text-base font-bold transition md:h-10 md:text-lg ${
                            row.set_number >= setRows.length
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-black text-white hover:opacity-80"
                          }`}
                          title="Kopieer deze set naar de set eronder"
                        >
                          ↓
                        </button>

                        {getAthleteSetVideo(exercise.id, row.set_number)
                          ?.video_url && (
                          <div className="col-span-6 rounded-xl border border-gray-200 bg-white p-2">
                            <video
                              src={
                                getAthleteSetVideo(exercise.id, row.set_number)
                                  ?.video_url || ""
                              }
                              controls
                              className="w-full max-h-[220px] rounded-xl bg-black"
                            />
                            {getAthleteSetVideo(exercise.id, row.set_number)
                              ?.caption?.trim() && (
                              <p className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
                                {
                                  getAthleteSetVideo(exercise.id, row.set_number)
                                    ?.caption
                                }
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                deleteAthleteSetVideo(exercise, row.set_number)
                              }
                              className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                            >
                              Video verwijderen
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </section>
            </div>
          );
        })()}

      {videoRecorderOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overscroll-none bg-black text-white">
            {!recordedVideoUrl && (
              <div
                className="relative h-[100dvh] w-full touch-none overflow-hidden bg-black"
                onTouchMove={(e) => e.preventDefault()}
              >
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full bg-black object-cover"
                />

                <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/95 to-transparent" />

                <div className="absolute left-4 right-4 top-[max(16px,env(safe-area-inset-top))] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={closeVideoRecorder}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-3xl font-light text-white backdrop-blur active:scale-95"
                    aria-label="Sluiten"
                  >
                    ×
                  </button>

                  <div className="rounded-full bg-black/45 px-4 py-2 text-center backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                      Video
                    </p>
                    <p className="max-w-[190px] truncate text-xs font-bold text-white">
                      {videoRecorderTarget
                        ? `${capitalizeExerciseName(videoRecorderTarget.exercise.name)} · set ${videoRecorderTarget.setNumber}`
                        : "Video opnemen"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleFlash}
                    disabled={isRecordingVideo}
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-lg backdrop-blur active:scale-95 disabled:opacity-30 ${
                      flashOn ? "bg-white text-black" : "bg-black/45 text-white"
                    }`}
                    aria-label="Flits"
                  >
                    ⚡
                  </button>
                </div>

                {cameraError && (
                  <div className="absolute left-5 right-5 top-28 rounded-3xl bg-red-500/90 p-4 text-center text-sm font-bold text-white shadow-2xl">
                    {cameraError}
                  </div>
                )}

                {isRecordingVideo && (
                  <div className="absolute left-1/2 top-[max(86px,calc(env(safe-area-inset-top)+70px))] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm font-black text-white backdrop-blur">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                    {formatVideoTime(recordingSeconds)}
                  </div>
                )}

                <div className="absolute bottom-[max(26px,env(safe-area-inset-bottom))] left-0 right-0 px-6">
                  {galleryOpen && galleryFiles.length > 0 && (
                    <div className="mb-5 max-h-44 overflow-y-auto rounded-3xl border border-white/15 bg-black/60 p-3 shadow-2xl backdrop-blur">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">
                          Camerarol
                        </p>
                        <button
                          type="button"
                          onClick={() => setGalleryOpen(false)}
                          className="text-xs font-bold text-white/60"
                        >
                          Sluit
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {galleryFiles.map((file, index) => (
                          <button
                            key={`${file.name}-${file.lastModified}-${index}`}
                            type="button"
                            onClick={() => chooseGalleryFile(file)}
                            className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-white/10"
                          >
                            <video
                              src={URL.createObjectURL(file)}
                              muted
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute bottom-1 left-1 right-1 truncate rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white">
                              Video {index + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => handleGalleryFiles(e.target.files)}
                    className="hidden"
                  />

                  <div className="grid grid-cols-3 items-center">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={isRecordingVideo}
                      className="flex h-12 w-12 items-center justify-center justify-self-start rounded-2xl bg-black/45 text-xl text-white backdrop-blur active:scale-95 disabled:opacity-30"
                      aria-label="Camerarol"
                    >
                      ▣
                    </button>

                    <button
                      type="button"
                      onClick={handleRecordButtonClick}
                      disabled={!cameraReady && !isRecordingVideo}
                      className={`relative flex h-20 w-20 items-center justify-center justify-self-center rounded-full border-[5px] border-white bg-white/15 shadow-2xl active:scale-95 disabled:opacity-50 ${
                        isRecordingVideo ? "border-red-500" : ""
                      }`}
                      aria-label={isRecordingVideo ? "Stop opname" : "Start opname"}
                    >
                      <span
                        className={`block transition-all ${
                          isRecordingVideo
                            ? "h-8 w-8 rounded-lg bg-red-500"
                            : "h-14 w-14 rounded-full bg-red-500"
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={switchCameraFacingMode}
                      disabled={isRecordingVideo}
                      className="flex h-12 w-12 items-center justify-center justify-self-end rounded-full bg-black/45 text-xl text-white backdrop-blur active:scale-95 disabled:opacity-30"
                      aria-label="Draai camera"
                    >
                      ↻
                    </button>
                  </div>

                  <p className="mt-4 text-center text-xs font-black uppercase tracking-[0.22em] text-red-400">
                    Video
                  </p>
                </div>
              </div>
            )}

            {recordedVideoUrl && (
              <div className="relative flex min-h-[100dvh] w-full flex-col overflow-y-auto overscroll-contain bg-black pb-52">
                <video
                  ref={previewVideoRef}
                  src={recordedVideoUrl}
                  playsInline
                  muted={muteVideoAudio}
                  onLoadedMetadata={handlePreviewLoadedMetadata}
                  className="absolute inset-0 h-full w-full bg-black object-contain"
                />

                <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/85 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black/95 to-transparent" />

                <div className="absolute left-4 right-4 top-[max(10px,env(safe-area-inset-top))]">
                  <div className="rounded-3xl border border-white/15 bg-black/40 p-3 shadow-2xl backdrop-blur">
                    <div
                      ref={trimSliderRef}
                      onPointerDown={(e) => {
                        const currentEnd = trimEnd || videoDuration;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const nextTime =
                          ((e.clientX - rect.left) / rect.width) * (videoDuration || 0);
                        const handle =
                          Math.abs(nextTime - trimStart) <= Math.abs(nextTime - currentEnd)
                            ? "start"
                            : "end";
                        setActiveTrimHandle(handle);
                        e.currentTarget.setPointerCapture(e.pointerId);
                        updateTrimFromClientX(e.clientX, handle);
                      }}
                      onPointerMove={(e) => {
                        if (!activeTrimHandle) return;
                        updateTrimFromClientX(e.clientX, activeTrimHandle);
                      }}
                      onPointerUp={(e) => {
                        setActiveTrimHandle(null);
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      }}
                      onPointerCancel={() => setActiveTrimHandle(null)}
                      className="relative h-14 touch-none overflow-hidden rounded-2xl border border-white/20 bg-white/10"
                    >
                      <div className="absolute inset-0 flex">
                        {Array.from({ length: 28 }).map((_, index) => (
                          <div
                            key={index}
                            className="mx-[1px] flex-1 rounded-sm bg-white/30"
                            style={{ opacity: index % 2 === 0 ? 0.9 : 0.45 }}
                          />
                        ))}
                      </div>

                      <div
                        className="absolute top-0 h-full bg-black/55"
                        style={{
                          left: 0,
                          width: `${videoDuration ? (trimStart / videoDuration) * 100 : 0}%`,
                        }}
                      />

                      <div
                        className="absolute top-0 h-full bg-black/55"
                        style={{
                          right: 0,
                          width: `${
                            videoDuration
                              ? ((videoDuration - (trimEnd || videoDuration)) / videoDuration) *
                                100
                              : 0
                          }%`,
                        }}
                      />

                      <div
                        className="absolute top-0 h-full rounded-2xl border-2 border-white shadow-[0_0_18px_rgba(255,255,255,0.22)]"
                        style={{
                          left: `${videoDuration ? (trimStart / videoDuration) * 100 : 0}%`,
                          right: `${
                            videoDuration
                              ? ((videoDuration - (trimEnd || videoDuration)) / videoDuration) *
                                100
                              : 0
                          }%`,
                        }}
                      />

                      <div
                        className="absolute top-1/2 z-10 h-12 w-4 -translate-y-1/2 rounded-full bg-white shadow-xl"
                        style={{
                          left: `calc(${videoDuration ? (trimStart / videoDuration) * 100 : 0}% - 8px)`,
                        }}
                      />

                      <div
                        className="absolute top-1/2 z-10 h-12 w-4 -translate-y-1/2 rounded-full bg-white shadow-xl"
                        style={{
                          left: `calc(${videoDuration ? ((trimEnd || videoDuration) / videoDuration) * 100 : 100}% - 8px)`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-center text-[11px] font-bold text-white/65">
                      {formatVideoTime(trimStart)} - {formatVideoTime(trimEnd || videoDuration)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={togglePreviewMute}
                  className="absolute right-4 top-[max(92px,calc(env(safe-area-inset-top)+84px))] flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-lg text-white backdrop-blur active:scale-95"
                  aria-label="Geluid aan of uit"
                >
                  {muteVideoAudio ? "🔇" : "🔊"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!previewVideoRef.current) return;
                    if (previewVideoRef.current.paused) {
                      previewVideoRef.current.play();
                    } else {
                      previewVideoRef.current.pause();
                    }
                  }}
                  className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-black shadow-2xl backdrop-blur active:scale-95"
                  aria-label="Video afspelen of pauzeren"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="ml-0.5 h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M8 5.5v13l10-6.5-10-6.5Z" />
                  </svg>
                </button>

                <div className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 z-10 px-4">
                  <div className="mx-auto mb-3 w-full max-w-sm">
                    <textarea
                      value={videoCaption}
                      onChange={(e) => setVideoCaption(e.target.value)}
                      onFocus={(e) => scrollMobileFieldIntoView(e.currentTarget)}
                      placeholder="Voeg een bijschrift toe..."
                      rows={2}
                      maxLength={500}
                      className="max-h-24 w-full resize-none rounded-3xl border border-white/15 bg-black/45 px-4 py-3 text-base text-white placeholder:text-white/45 outline-none backdrop-blur focus:border-white/30"
                    />
                  </div>

                  <div className="mx-auto grid w-full max-w-sm grid-cols-3 items-center">
                    <button
                      type="button"
                      onClick={resetRecordedVideo}
                      disabled={trimmingVideo || !!uploadingVideoSetKey}
                      className="flex h-12 w-12 items-center justify-center justify-self-start rounded-full bg-white/10 text-2xl font-light text-white backdrop-blur active:scale-95 disabled:opacity-40"
                      aria-label="Opnieuw"
                    >
                      ×
                    </button>

                    <div />

                    <button
                      type="button"
                      onClick={saveRecordedVideo}
                      disabled={trimmingVideo || !!uploadingVideoSetKey}
                      className="flex h-12 w-12 items-center justify-center justify-self-end rounded-full bg-white text-2xl font-black text-black shadow-xl active:scale-95 disabled:opacity-40"
                      aria-label="Gebruik video"
                    >
                      {trimmingVideo || uploadingVideoSetKey ? "…" : "✓"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}

    </main>
    </div>
  );
}
