"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { PageContainer, PageHeader, Panel } from "@/components/ui/design-system";
import AthleteProgressTabs from "@/components/data/AthleteProgressTabs";
import CollapsibleFilterSidebar from "@/components/ui/CollapsibleFilterSidebar";
import SearchInput from "@/components/ui/SearchInput";
import ExerciseVideoBadge from "@/components/ExerciseVideoBadge";
import { supabase } from "@/lib/supabaseClient";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type Athlete = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type AthleteVideo = {
  id: string;
  athlete_id: string;
  program_exercise_id: string;
  set_number: number;
  video_url: string | null;
  video_path: string | null;
  file_name: string | null;
  exercise_name: string;
  priority: string | null;
  reps_display: string;
  weight_display: string;
  rpe_display: string;
  block_week_display: string;
  block_label: string;
  week_label: string;
  day_label: string;
  day_short_display: string;
  search_text: string;
  block_order: number;
  week_order: number;
  day_order: number;
  exercise_order: number;
  updated_at?: string | null;
};

type ProgramExerciseInfo = {
  id: string;
  name: string | null;
  reps: string | null;
  load: string | null;
  rpe: string | null;
  program_day_id: string;
  exercise_number: number | null;
  priority: string | null;
};

type ProgramDayInfo = {
  id: string;
  title: string | null;
  program_week_id: string;
  day_number: number;
};

type ProgramWeekInfo = {
  id: string;
  title: string | null;
  program_block_id: string;
  week_number: number;
};

type ProgramBlockInfo = {
  id: string;
  title: string | null;
  start_date: string | null;
};

type WeekFilter = {
  key: string;
  blockId: string;
  weekId: string;
  blockNumber: number;
  weekNumber: number;
  label: string;
};

type CompareSlot = 0 | 1 | 2 | 3;

type VideoTransform = {
  scale: number;
  x: number;
  y: number;
};

const defaultTransform: VideoTransform = {
  scale: 1,
  x: 0,
  y: 0,
};

export default function VideoGalleryPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageContainer size="full">
            <Panel>
              <p className="text-sm text-app-muted">Video&apos;s laden…</p>
            </Panel>
          </PageContainer>
        </AppShell>
      }
    >
      <VideoGalleryPageInner />
    </Suspense>
  );
}

function VideoGalleryPageInner() {
  const [userId, setUserId] = useState("");
  const [isAthleteViewer, setIsAthleteViewer] = useState(false);

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");

  const [weekFilters, setWeekFilters] = useState<WeekFilter[]>([]);
  const [selectedWeekKeys, setSelectedWeekKeys] = useState<string[]>([]);

  const [videos, setVideos] = useState<AthleteVideo[]>([]);
  const [thumbnailByVideoId, setThumbnailByVideoId] = useState<Record<string, string>>({});
  const [loadedVideoIds, setLoadedVideoIds] = useState<Record<string, boolean>>({});
  const [fullscreenVideo, setFullscreenVideo] = useState<AthleteVideo | null>(null);

  const [search, setSearch] = useState("");
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);
  const [liftFilters, setLiftFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const [compareMode, setCompareMode] = useState(false);
  const [compareCount, setCompareCount] = useState<2 | 3 | 4>(2);
  const [compareSearches, setCompareSearches] = useState(["", "", "", ""]);
  const [compareVideoIds, setCompareVideoIds] = useState(["", "", "", ""]);
  const [moveEnabledSlots, setMoveEnabledSlots] = useState<Record<number, boolean>>({});
  const [comparePlayingByVideoId, setComparePlayingByVideoId] = useState<Record<string, boolean>>({});
  const [compareProgressByVideoId, setCompareProgressByVideoId] = useState<Record<string, number>>({});
  const [compareDurationByVideoId, setCompareDurationByVideoId] = useState<Record<string, number>>({});
  const [videoTransforms, setVideoTransforms] = useState<Record<string, VideoTransform>>({});

  const compareVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const dragStateRef = useRef<{
    slot: CompareSlot;
    videoId: string;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  async function loadProfileAndAthletes() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (myProfile?.role === "atleet") {
      setIsAthleteViewer(true);
      setAthletes([
        {
          id: user.id,
          full_name: myProfile.full_name || "Atleet",
          role: myProfile.role,
        },
      ]);
      setSelectedAthleteId(user.id);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["atleet", "athlete"])
      .order("full_name", { ascending: true });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const loadedAthletes = (data || []) as Athlete[];
    setAthletes(loadedAthletes);

    if (loadedAthletes.length > 0) {
      setSelectedAthleteId(loadedAthletes[0].id);
    }

    setLoading(false);
  }

  async function loadWeekFilters(athleteId: string) {
    const { data: blocksData, error: blocksError } = await supabase
      .from("program_blocks")
      .select("id, title, start_date")
      .eq("athlete_id", athleteId)
      .order("start_date", { ascending: true });

    if (blocksError) {
      alert(blocksError.message);
      return;
    }

    const blocks = (blocksData || []) as ProgramBlockInfo[];
    const blockIds = blocks.map((block) => block.id);

    if (blockIds.length === 0) {
      setWeekFilters([]);
      setSelectedWeekKeys([]);
      return;
    }

    const { data: weeksData, error: weeksError } = await supabase
      .from("program_weeks")
      .select("id, title, week_number, program_block_id")
      .in("program_block_id", blockIds)
      .order("week_number", { ascending: true });

    if (weeksError) {
      alert(weeksError.message);
      return;
    }

    const blockNumberById = Object.fromEntries(
      blocks.map((block, index) => [block.id, getBlockNumber(block, index)]),
    );

    const filters = ((weeksData || []) as ProgramWeekInfo[])
      .map((week) => {
        const blockNumber = blockNumberById[week.program_block_id] || 0;
        const weekNumber = week.week_number || 0;

        return {
          key: `${week.program_block_id}-${week.id}`,
          blockId: week.program_block_id,
          weekId: week.id,
          blockNumber,
          weekNumber,
          label: `Block ${blockNumber} week ${weekNumber}`,
        };
      })
      .sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
        return a.weekNumber - b.weekNumber;
      });

    setWeekFilters(filters);
    setSelectedWeekKeys(filters.map((filter) => filter.key));
  }

  async function loadVideos(athleteId: string) {
    setLoadingVideos(true);
    setLoadedVideoIds({});
    setCompareVideoIds(["", "", "", ""]);

    const { data: videoData, error: videoError } = await supabase
      .from("athlete_exercise_videos")
      .select("*")
      .eq("athlete_id", athleteId)
      .not("video_url", "is", null);

    if (videoError) {
      alert(videoError.message);
      setLoadingVideos(false);
      return;
    }

    const exerciseIds = Array.from(
      new Set((videoData || []).map((video) => video.program_exercise_id)),
    ).filter(Boolean);

    let exercisesById: Record<string, ProgramExerciseInfo> = {};
    let daysById: Record<string, ProgramDayInfo> = {};
    let weeksById: Record<string, ProgramWeekInfo> = {};
    let blocksById: Record<string, ProgramBlockInfo & { block_number: number }> = {};
    let setInputsByKey: Record<string, { reps: string; weight: string; rpe: string }> = {};

    if (exerciseIds.length > 0) {
      const { data: exerciseData, error: exerciseError } = await supabase
        .from("program_exercises")
        .select("id, name, reps, load, rpe, program_day_id, exercise_number, priority")
        .in("id", exerciseIds);

      if (exerciseError) {
        alert(exerciseError.message);
        setLoadingVideos(false);
        return;
      }

      const exercises = (exerciseData || []) as ProgramExerciseInfo[];
      exercisesById = Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise]));

      const dayIds = Array.from(new Set(exercises.map((exercise) => exercise.program_day_id))).filter(Boolean);

      if (dayIds.length > 0) {
        const { data: dayData, error: dayError } = await supabase
          .from("program_days")
          .select("id, title, program_week_id, day_number")
          .in("id", dayIds);

        if (dayError) {
          alert(dayError.message);
          setLoadingVideos(false);
          return;
        }

        const days = (dayData || []) as ProgramDayInfo[];
        daysById = Object.fromEntries(days.map((day) => [day.id, day]));

        const weekIds = Array.from(new Set(days.map((day) => day.program_week_id))).filter(Boolean);

        if (weekIds.length > 0) {
          const { data: weekData, error: weekError } = await supabase
            .from("program_weeks")
            .select("id, title, program_block_id, week_number")
            .in("id", weekIds);

          if (weekError) {
            alert(weekError.message);
            setLoadingVideos(false);
            return;
          }

          const weeks = (weekData || []) as ProgramWeekInfo[];
          weeksById = Object.fromEntries(weeks.map((week) => [week.id, week]));

          const blockIds = Array.from(new Set(weeks.map((week) => week.program_block_id))).filter(Boolean);

          if (blockIds.length > 0) {
            const { data: blockData, error: blockError } = await supabase
              .from("program_blocks")
              .select("id, title, start_date")
              .in("id", blockIds)
              .order("start_date", { ascending: true });

            if (blockError) {
              alert(blockError.message);
              setLoadingVideos(false);
              return;
            }

            const blocks = (blockData || []) as ProgramBlockInfo[];
            blocksById = Object.fromEntries(
              blocks.map((block, index) => [
                block.id,
                {
                  ...block,
                  block_number: getBlockNumber(block, index),
                },
              ]),
            );
          }
        }
      }

      const { data: setData, error: setError } = await supabase
        .from("athlete_exercise_sets")
        .select("program_exercise_id, set_number, reps, weight, rpe")
        .eq("athlete_id", athleteId)
        .in("program_exercise_id", exerciseIds);

      if (setError) {
        alert(setError.message);
        setLoadingVideos(false);
        return;
      }

      setInputsByKey = Object.fromEntries(
        (setData || []).map((set) => [
          `${set.program_exercise_id}-${set.set_number}`,
          {
            reps: set.reps || "",
            weight: set.weight || "",
            rpe: set.rpe || "",
          },
        ]),
      );
    }

    const videosWithDetails = (videoData || []).map((video) => {
      const exercise = exercisesById[video.program_exercise_id];
      const day = exercise ? daysById[exercise.program_day_id] : undefined;
      const week = day ? weeksById[day.program_week_id] : undefined;
      const block = week ? blocksById[week.program_block_id] : undefined;
      const athleteSet = setInputsByKey[`${video.program_exercise_id}-${video.set_number}`];

      const reps = cleanValue(athleteSet?.reps) || cleanValue(exercise?.reps) || "-";
      const weight = cleanWeight(athleteSet?.weight) || cleanWeight(exercise?.load) || "-";
      const rpe = cleanValue(athleteSet?.rpe) || cleanValue(exercise?.rpe) || "-";

      const blockNumber = block?.block_number || 0;
      const weekNumber = week?.week_number || 0;
      const dayNumber = day?.day_number || 0;

      const exerciseName = exercise?.name || "Oefening";
      const blockLabel = blockNumber ? `Block ${blockNumber}` : "Block";
      const weekLabel = weekNumber ? `Week ${weekNumber}` : "Week";
      const dayLabel = day?.title || (dayNumber ? `Dag ${dayNumber}` : "Dag");
      const dayShortDisplay = getShortDayDisplay(block, week, day);
      const blockWeekDisplay = blockNumber && weekNumber ? `B${blockNumber}.W${weekNumber}` : "";

      const searchParts = [
        exerciseName,
        `rpe ${rpe}`,
        `${reps} reps`,
        weight,
        blockLabel,
        `b${blockNumber}`,
        weekLabel,
        `${blockLabel} ${weekLabel}`,
        `b${blockNumber}w${weekNumber}`,
        dayLabel,
        dayShortDisplay,
        `dag ${dayNumber}`,
        `set ${video.set_number || 1}`,
      ];

      return {
        ...video,
        exercise_name: exerciseName,
        priority: exercise?.priority || null,
        reps_display: reps,
        weight_display: weight,
        rpe_display: rpe,
        block_week_display: blockWeekDisplay,
        block_label: blockLabel,
        week_label: weekLabel,
        day_label: dayLabel,
        day_short_display: dayShortDisplay,
        search_text: searchParts.join(" ").toLowerCase(),
        block_order: blockNumber,
        week_order: weekNumber,
        day_order: dayNumber,
        exercise_order: exercise?.exercise_number || 999,
      };
    }) as AthleteVideo[];

    videosWithDetails.sort((a, b) => {
      const uploadDiff =
        new Date(b.updated_at || 0).getTime() -
        new Date(a.updated_at || 0).getTime();

      if (uploadDiff !== 0) return uploadDiff;

      if ((b.block_order || 0) !== (a.block_order || 0)) {
        return (b.block_order || 0) - (a.block_order || 0);
      }
      if ((b.week_order || 0) !== (a.week_order || 0)) {
        return (b.week_order || 0) - (a.week_order || 0);
      }
      if ((b.day_order || 0) !== (a.day_order || 0)) {
        return (b.day_order || 0) - (a.day_order || 0);
      }
      if ((a.exercise_order || 999) !== (b.exercise_order || 999)) {
        return (a.exercise_order || 999) - (b.exercise_order || 999);
      }
      return (a.set_number || 1) - (b.set_number || 1);
    });

    setVideos(videosWithDetails);
    setLoadingVideos(false);
  }

  async function captureFirstFrame(video: AthleteVideo) {
    if (!video.video_url || thumbnailByVideoId[video.id]) return;

    try {
      const element = document.createElement("video");
      element.crossOrigin = "anonymous";
      element.preload = "auto";
      element.muted = true;
      element.playsInline = true;
      element.src = video.video_url;

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("timeout")), 6000);
        element.onloadeddata = () => {
          window.clearTimeout(timeout);
          resolve();
        };
        element.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error("error"));
        };
      });

      element.currentTime = Math.min(0.12, element.duration || 0.12);

      await new Promise<void>((resolve) => {
        element.onseeked = () => resolve();
        window.setTimeout(resolve, 600);
      });

      const canvas = document.createElement("canvas");
      canvas.width = element.videoWidth || 480;
      canvas.height = element.videoHeight || 720;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.drawImage(element, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.78);

      setThumbnailByVideoId((current) => ({
        ...current,
        [video.id]: dataUrl,
      }));
    } catch {
      // Als browser/CORS thumbnail blokkeert, blijft zwarte fallback zichtbaar.
    }
  }

  useEffect(() => {
    deferEffectUpdate(() => {
      void loadProfileAndAthletes();
    });
  }, []);

  useEffect(() => {
    if (!selectedAthleteId) return;
    deferEffectUpdate(() => {
      void loadWeekFilters(selectedAthleteId);
      void loadVideos(selectedAthleteId);
    });
  }, [selectedAthleteId]);

  useEffect(() => {
    videos.slice(0, 24).forEach((video) => {
      if (video.video_url && !thumbnailByVideoId[video.id]) {
        void captureFirstFrame(video);
      }
    });
  }, [videos, thumbnailByVideoId]);

  function cleanValue(value: string | null | undefined) {
    return (value || "").toString().trim();
  }

  function cleanWeight(value: string | null | undefined) {
    const clean = cleanValue(value).replace("kg", "").replace("KG", "").trim();
    if (!clean || clean === "-") return "-";
    return `${clean} kg`;
  }

  function getBlockNumber(block: ProgramBlockInfo | undefined, index: number) {
    const match = (block?.title || "").match(/\d+/);
    if (match) return Number(match[0]);
    return index + 1;
  }

  function getShortDayDisplay(
    block: (ProgramBlockInfo & { block_number: number }) | undefined,
    week: ProgramWeekInfo | undefined,
    day: ProgramDayInfo | undefined,
  ) {
    if (!day) return "";

    const title = (day.title || "").toLowerCase();
    let dayShort = "";

    if (title.includes("maandag")) dayShort = "ma";
    else if (title.includes("dinsdag")) dayShort = "di";
    else if (title.includes("woensdag")) dayShort = "wo";
    else if (title.includes("donderdag")) dayShort = "do";
    else if (title.includes("vrijdag")) dayShort = "vr";
    else if (title.includes("zaterdag")) dayShort = "za";
    else if (title.includes("zondag")) dayShort = "zo";
    else if (day.day_number === 1) dayShort = "ma";
    else if (day.day_number === 2) dayShort = "di";
    else if (day.day_number === 3) dayShort = "wo";
    else if (day.day_number === 4) dayShort = "do";
    else if (day.day_number === 5) dayShort = "vr";
    else if (day.day_number === 6) dayShort = "za";
    else if (day.day_number === 7) dayShort = "zo";

    if (!block?.start_date || !week?.week_number || !day?.day_number) return dayShort;

    const date = new Date(block.start_date);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + (week.week_number - 1) * 7 + (day.day_number - 1));

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    const mondayOffset = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - mondayOffset);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (date >= weekStart && date <= weekEnd) return dayShort;

    return `${dayShort} ${date.getDate()}-${date.getMonth() + 1}`;
  }

  function toggleWeek(key: string) {
    setSelectedWeekKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function toggleAllWeeks() {
    if (selectedWeekKeys.length === weekFilters.length) {
      setSelectedWeekKeys([]);
    } else {
      setSelectedWeekKeys(weekFilters.map((filter) => filter.key));
    }
  }

  function togglePriorityFilter(value: string) {
    setPriorityFilters((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function toggleLiftFilter(value: string) {
    setLiftFilters((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function matchesPriorityFilter(priority: string | null, filter: string) {
    return (priority || "").trim().toLowerCase() === filter;
  }

  function matchesLiftFilter(exerciseName: string, filter: string) {
    const clean = exerciseName.toLowerCase();
    if (filter === "squat") return clean.includes("squat");
    if (filter === "bench") return clean.includes("bench");
    if (filter === "deadlift") return clean.includes("deadlift");
    return false;
  }

  function matchesSearch(video: AthleteVideo, query: string) {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return true;
    return video.search_text.includes(cleanQuery);
  }

  const visibleVideos = useMemo(() => {
    const selectedFilters = weekFilters.filter((filter) => selectedWeekKeys.includes(filter.key));
    if (selectedFilters.length === 0) return [];

    return videos.filter((video) => {
      const matchesSelectedWeek = selectedFilters.some(
        (filter) => filter.weekNumber === video.week_order && filter.blockNumber === video.block_order,
      );

      if (!matchesSelectedWeek) return false;
      if (!matchesSearch(video, search)) return false;

      if (
        priorityFilters.length > 0 &&
        !priorityFilters.some((filter) =>
          matchesPriorityFilter(video.priority, filter),
        )
      ) {
        return false;
      }

      if (
        liftFilters.length > 0 &&
        !liftFilters.some((filter) => matchesLiftFilter(video.exercise_name, filter))
      ) {
        return false;
      }

      return true;
    });
  }, [videos, search, selectedWeekKeys, weekFilters, priorityFilters, liftFilters]);

  const compareVideosBySlot = [0, 1, 2, 3].map(
    (slot) => videos.find((video) => video.id === compareVideoIds[slot]) || null,
  );

  function updateCompareSearch(slot: CompareSlot, value: string) {
    setCompareSearches((current) => {
      const next = [...current];
      next[slot] = value;
      return next;
    });
  }

  function updateCompareVideo(slot: CompareSlot, videoId: string) {
    setCompareVideoIds((current) => {
      const next = [...current];
      next[slot] = videoId;
      return next;
    });

    setLoadedVideoIds((current) => ({
      ...current,
      [videoId]: true,
    }));
  }

  function getVideoTransform(videoId: string) {
    return videoTransforms[videoId] || defaultTransform;
  }

  function setVideoTransform(videoId: string, transform: VideoTransform) {
    setVideoTransforms((current) => ({
      ...current,
      [videoId]: transform,
    }));
  }

  function handleWheelZoom(event: React.WheelEvent<HTMLDivElement>, videoId: string) {
    event.preventDefault();
    event.stopPropagation();

    const transform = getVideoTransform(videoId);
    const nextScale = Math.min(4, Math.max(0.6, transform.scale + -event.deltaY * 0.002));

    setVideoTransform(videoId, {
      ...transform,
      scale: nextScale,
    });
  }

  function handleDragStart(
    event: React.PointerEvent<HTMLDivElement>,
    slot: CompareSlot,
    videoId: string,
  ) {
    if (!moveEnabledSlots[slot]) return;

    const transform = getVideoTransform(videoId);

    dragStateRef.current = {
      slot,
      videoId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: transform.x,
      baseY: transform.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDragMove(event: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || !moveEnabledSlots[dragState.slot]) return;

    const transform = getVideoTransform(dragState.videoId);

    setVideoTransform(dragState.videoId, {
      ...transform,
      x: dragState.baseX + event.clientX - dragState.startX,
      y: dragState.baseY + event.clientY - dragState.startY,
    });
  }

  function handleDragEnd() {
    dragStateRef.current = null;
  }

  function toggleCompareVideoPlay(videoId: string) {
    const element = compareVideoRefs.current[videoId];
    if (!element) return;

    if (element.paused) {
      element.play();
      setComparePlayingByVideoId((current) => ({ ...current, [videoId]: true }));
    } else {
      element.pause();
      setComparePlayingByVideoId((current) => ({ ...current, [videoId]: false }));
    }
  }

  function handleCompareSeek(videoId: string, value: string) {
    const element = compareVideoRefs.current[videoId];
    if (!element) return;

    element.currentTime = Number(value);
  }

  function renderVideoCard(
    video: AthleteVideo,
    options?: {
      compact?: boolean;
      selectable?: boolean;
      selected?: boolean;
      onSelect?: () => void;
    },
  ) {
    const compact = options?.compact;
    const thumbnail = thumbnailByVideoId[video.id];

    return (
      <button
        key={video.id}
        onClick={() => {
          if (options?.selectable) {
            options.onSelect?.();
            return;
          }

          setLoadedVideoIds((current) => ({ ...current, [video.id]: true }));
          setFullscreenVideo(video);
        }}
        className={`app-focus-ring relative overflow-hidden rounded-2xl border border-app-border bg-black text-left transition ${
          options?.selected ? "ring-2 ring-app-accent" : "hover:border-app-border-strong hover:scale-[1.01]"
        }`}
      >
        <div className={`${compact ? "aspect-video" : "aspect-[16/27]"} bg-black relative`}>
          <ExerciseVideoBadge
            exerciseName={video.exercise_name}
            priority={video.priority}
          />

          {thumbnail ? (
            <img src={thumbnail} alt="" className="h-full w-full bg-black object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black text-white/70">
              Voorbeeld laden...
            </div>
          )}

          {options?.selectable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-lg">▶</div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-3 pt-10">
            <div className="flex items-center justify-between gap-2">
              <h2 className={`truncate font-bold text-white ${compact ? "text-sm" : "text-base"}`}>
                {video.exercise_name || "Oefening"}
                {video.day_short_display && (
                  <span className="ml-1 text-white/60">· {video.day_short_display}</span>
                )}
              </h2>

              {video.block_week_display && (
                <span className="shrink-0 rounded-full bg-white/20 px-2 py-1 text-[10px] font-bold text-white">
                  {video.block_week_display}
                </span>
              )}
            </div>

            <p className={`mt-1 font-semibold text-white/90 ${compact ? "text-xs" : "text-sm"}`}>
              Set {video.set_number || 1}: {video.reps_display} x {video.weight_display} rpe {video.rpe_display}
            </p>
          </div>
        </div>
      </button>
    );
  }

  function renderComparePane(slot: CompareSlot) {
    const query = compareSearches[slot];
    const selectedVideoId = compareVideoIds[slot];
    const selectedVideo = compareVideosBySlot[slot];
    const list = visibleVideos.filter((video) => matchesSearch(video, query));
    const transform = selectedVideo ? getVideoTransform(selectedVideo.id) : defaultTransform;

    return (
      <div className="min-w-0 rounded-2xl border border-app-border bg-app-surface p-2">
        <div className="relative mb-3">
          <SearchInput
            value={query}
            onChange={(next) => updateCompareSearch(slot, next)}
            placeholder="Zoek: squat, rpe 7, 5 reps, 120 kg, b1w1"
            variant="rounded"
            className="w-full"
          />
        </div>

        <div className="mb-3 grid max-h-[260px] grid-cols-2 gap-2 overflow-y-auto pr-2">
          {list.map((video) =>
            renderVideoCard(video, {
              compact: true,
              selectable: true,
              selected: selectedVideoId === video.id,
              onSelect: () => updateCompareVideo(slot, video.id),
            }),
          )}
        </div>

        <div
          className={`relative h-[70dvh] max-h-[860px] min-h-[420px] overflow-hidden rounded-2xl bg-black md:h-[78vh] md:min-h-[620px] ${
            moveEnabledSlots[slot] ? "touch-none cursor-move" : "cursor-default"
          }`}
          onWheel={(e) => {
            if (!selectedVideo) return;
            e.preventDefault();
            e.stopPropagation();

            if (moveEnabledSlots[slot]) {
              handleWheelZoom(e, selectedVideo.id);
            }
          }}
          onPointerDown={(e) => {
            if (selectedVideo && moveEnabledSlots[slot]) {
              handleDragStart(e, slot, selectedVideo.id);
            }
          }}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          {selectedVideo && selectedVideo.video_url ? (
            <>
              <video
                ref={(element) => {
                  compareVideoRefs.current[selectedVideo.id] = element;
                }}
                src={selectedVideo.video_url}
                playsInline
                preload="metadata"
                poster={thumbnailByVideoId[selectedVideo.id] || undefined}
                className="h-full w-full bg-black object-cover"
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                  transformOrigin: "center center",
                }}
                onLoadedMetadata={(event) => {
                  const duration = event.currentTarget.duration || 0;
                  setCompareDurationByVideoId((current) => ({
                    ...current,
                    [selectedVideo.id]: duration,
                  }));
                }}
                onTimeUpdate={(e) => {
                  setCompareProgressByVideoId((current) => ({
                    ...current,
                    [selectedVideo.id]: e.currentTarget?.currentTime || 0,
                  }));
                }}
                onPlay={() =>
                  setComparePlayingByVideoId((current) => ({
                    ...current,
                    [selectedVideo.id]: true,
                  }))
                }
                onPause={() =>
                  setComparePlayingByVideoId((current) => ({
                    ...current,
                    [selectedVideo.id]: false,
                  }))
                }
              />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveEnabledSlots((current) => ({
                    ...current,
                    [slot]: !current[slot],
                  }));
                }}
                className={`app-focus-ring absolute right-14 top-2 z-30 flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold transition ${
                  moveEnabledSlots[slot]
                    ? "bg-app-accent text-white"
                    : "bg-black/70 text-white hover:bg-black/80"
                }`}
                title={moveEnabledSlots[slot] ? "Video vastzetten" : "Video aanpassen"}
              >
                ⛶
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCompareVideoIds((current) => {
                    const next = [...current];
                    next[slot] = "";
                    return next;
                  });
                  setMoveEnabledSlots((current) => ({
                    ...current,
                    [slot]: false,
                  }));
                }}
                className="app-focus-ring absolute right-2 top-2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-lg font-bold text-white transition hover:bg-black/80"
                title="Compare vak legen"
              >
                ×
              </button>

              <div
                className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 to-transparent p-3"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCompareVideoPlay(selectedVideo.id);
                    }}
                    className="app-focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-app-accent text-sm font-bold text-white"
                  >
                    {comparePlayingByVideoId[selectedVideo.id] ? "Ⅱ" : "▶"}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max={compareDurationByVideoId[selectedVideo.id] || 0}
                    step="0.01"
                    value={compareProgressByVideoId[selectedVideo.id] || 0}
                    onChange={(e) => handleCompareSeek(selectedVideo.id, e.target.value)}
                    className="w-full accent-app-accent"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black text-white/70">
              Kies een video
            </div>
          )}
        </div>
      </div>
    );
  }

  const galleryInner = (
    <div className="flex min-h-0 min-w-0 flex-1 gap-0 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
        {!compareMode && (
          <CollapsibleFilterSidebar title="Weeks">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-app-subtle">
                Block / week
              </span>
              <button
                type="button"
                onClick={toggleAllWeeks}
                className="app-focus-ring rounded-lg bg-app-surface-muted px-2 py-1 text-[11px] font-semibold text-app-muted transition hover:bg-app-surface-hover hover:text-app-text"
              >
                {selectedWeekKeys.length === weekFilters.length
                  ? "Uit"
                  : "Alles"}
              </button>
            </div>
            {weekFilters.map((filter) => (
              <label
                key={filter.key}
                className="mb-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-app-text transition-colors hover:bg-app-surface-hover"
              >
                <input
                  type="checkbox"
                  checked={selectedWeekKeys.includes(filter.key)}
                  onChange={() => toggleWeek(filter.key)}
                  className="h-3.5 w-3.5 accent-app-accent"
                />
                <span className="truncate">{filter.label}</span>
              </label>
            ))}
          </CollapsibleFilterSidebar>
        )}

        <section className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 mobile-scroll md:p-5">
          {!isAthleteViewer && (
            <PageHeader
              eyebrow="Video's"
              title="Video galerij"
              description={`${visibleVideos.length} video's${
                selectedAthleteId
                  ? ` · ${athletes.find((a) => a.id === selectedAthleteId)?.full_name || "Atleet"}`
                  : ""
              }`}
              actions={
              <>
                <select
                  value={selectedAthleteId}
                  onChange={(e) => setSelectedAthleteId(e.target.value)}
                  className="min-h-11 w-full min-w-0 rounded-xl border border-app-border bg-app-surface px-3 text-base text-app-text outline-none app-focus-ring sm:w-auto sm:min-w-[180px] md:text-sm"
                >
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.full_name || "Naamloos"}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setCompareMode(!compareMode)}
                  className="app-btn-primary app-focus-ring min-h-11"
                >
                  {compareMode ? "Galerij" : "Vergelijken"}
                </button>

                {compareMode ? (
                  <div className="flex rounded-xl border border-app-border bg-app-surface-muted p-1">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setCompareCount(count as 2 | 3 | 4)}
                        className={`app-focus-ring min-h-9 flex-1 rounded-lg px-4 text-xs font-semibold transition sm:flex-none ${
                          compareCount === count
                            ? "bg-app-accent text-white"
                            : "text-app-muted hover:bg-app-surface-hover hover:text-app-text"
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
              }
            />
          )}

            {!compareMode && (
              <Panel className="mb-4 space-y-4">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Zoek oefening, RPE, reps, gewicht, block..."
                  variant="rounded"
                  className="w-full"
                />

                <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                  {[
                    { id: "primary", label: "Primary" },
                    { id: "secondary", label: "Secondary" },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => togglePriorityFilter(filter.id)}
                      className={`app-focus-ring min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                        priorityFilters.includes(filter.id)
                          ? "bg-app-accent text-white"
                          : "border border-app-border bg-app-surface text-app-muted hover:bg-app-surface-hover"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  {[
                    { id: "squat", label: "Squat" },
                    { id: "bench", label: "Bench" },
                    { id: "deadlift", label: "Deadlift" },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => toggleLiftFilter(filter.id)}
                      className={`app-focus-ring min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                        liftFilters.includes(filter.id)
                          ? "bg-app-accent text-white"
                          : "border border-app-border bg-app-surface text-app-muted hover:bg-app-surface-hover"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </Panel>
            )}

          {loading ? (
            <Panel className="py-10 text-center text-sm text-app-muted">Laden…</Panel>
          ) : loadingVideos ? (
            <Panel className="py-10 text-center text-sm text-app-muted">Video&apos;s laden…</Panel>
          ) : compareMode ? (
            <div
              className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${
                compareCount === 4 ? "lg:grid-cols-4" : compareCount === 3 ? "lg:grid-cols-3" : ""
              }`}
            >
              {renderComparePane(0)}
              {renderComparePane(1)}
              {compareCount >= 3 && renderComparePane(2)}
              {compareCount >= 4 && renderComparePane(3)}
            </div>
          ) : visibleVideos.length === 0 ? (
            <Panel className="py-10 text-center text-sm text-app-muted">Geen video&apos;s gevonden.</Panel>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {visibleVideos.map((video) => renderVideoCard(video))}
            </div>
          )}
        </section>
      </div>
  );

  return (
    <>
      <AppShell contentClassName="app-page-content flex min-h-0 flex-1 flex-col px-2 pb-24 md:px-3 lg:px-4 lg:pb-6">
        <PageContainer size="full" className="flex min-h-0 flex-1 flex-col">
          {isAthleteViewer ? (
            <div className="mb-4">
              <PageHeader
                eyebrow="Voortgang"
                title="Voortgang & video's"
                description="Bekijk je statistieken en trainingsvideo's."
              />
              <AthleteProgressTabs active="video" />
            </div>
          ) : null}
          {galleryInner}
        </PageContainer>
      </AppShell>

      {fullscreenVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
          <button
            onClick={() => setFullscreenVideo(null)}
            className="app-focus-ring absolute right-[max(1.25rem,env(safe-area-inset-right))] top-[max(1.25rem,env(safe-area-inset-top))] min-h-11 rounded-full bg-white/10 px-4 font-semibold text-white transition hover:bg-white/20"
          >
            Sluiten
          </button>

          <div className="w-full max-w-4xl">
            <video
              src={fullscreenVideo.video_url || ""}
              controls
              autoPlay
              playsInline
              preload="metadata"
              poster={thumbnailByVideoId[fullscreenVideo.id] || undefined}
              className="max-h-[82vh] w-full rounded-2xl bg-black object-cover"
            />

            <div className="mt-4 text-white">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold tracking-tight md:text-xl">{fullscreenVideo.exercise_name}</h2>

                <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
                  {fullscreenVideo.block_week_display}
                </span>
              </div>

              <p className="mt-1 text-white/70">
                Set {fullscreenVideo.set_number}: {fullscreenVideo.reps_display} x{" "}
                {fullscreenVideo.weight_display} rpe {fullscreenVideo.rpe_display}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
