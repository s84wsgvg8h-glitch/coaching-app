"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type DashboardLink = {
  href?: string;
  icon: string;
  title: string;
  description?: string;
  badge?: number;
  action?: () => void;
};

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
};

type ProgramExerciseInfo = {
  id: string;
  name: string | null;
  reps: string | null;
  load: string | null;
  rpe: string | null;
  program_day_id: string;
  exercise_number: number | null;
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
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");

  const [weekFilters, setWeekFilters] = useState<WeekFilter[]>([]);
  const [selectedWeekKeys, setSelectedWeekKeys] = useState<string[]>([]);

  const [videos, setVideos] = useState<AthleteVideo[]>([]);
  const [thumbnailByVideoId, setThumbnailByVideoId] = useState<Record<string, string>>({});
  const [loadedVideoIds, setLoadedVideoIds] = useState<Record<string, boolean>>({});
  const [fullscreenVideo, setFullscreenVideo] = useState<AthleteVideo | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const [compareMode, setCompareMode] = useState(false);
  const [compareCount, setCompareCount] = useState<2 | 3 | 4>(2);
  const [compareSearches, setCompareSearches] = useState(["", "", "", ""]);
  const [compareVideoIds, setCompareVideoIds] = useState(["", "", "", ""]);
  const [moveEnabledSlots, setMoveEnabledSlots] = useState<Record<number, boolean>>({});
  const [comparePlayingByVideoId, setComparePlayingByVideoId] = useState<Record<string, boolean>>({});
  const [compareProgressByVideoId, setCompareProgressByVideoId] = useState<Record<string, number>>({});
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

  useEffect(() => {
    loadProfileAndAthletes();
  }, []);

  useEffect(() => {
    if (selectedAthleteId) {
      loadWeekFilters(selectedAthleteId);
      loadVideos(selectedAthleteId);
    }
  }, [selectedAthleteId]);

  useEffect(() => {
    videos.slice(0, 80).forEach((video) => {
      if (video.video_url && !thumbnailByVideoId[video.id]) {
        captureFirstFrame(video);
      }
    });
  }, [videos]);

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      setFullName(profile.full_name || "");
      setRole(profile.role || "");
    }

    const { data: pendingProfiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "pending");

    setPendingCount(pendingProfiles?.length || 0);

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
        .select("id, name, reps, load, rpe, program_day_id, exercise_number")
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
      if ((b.block_order || 0) !== (a.block_order || 0)) return (b.block_order || 0) - (a.block_order || 0);
      if ((b.week_order || 0) !== (a.week_order || 0)) return (b.week_order || 0) - (a.week_order || 0);
      if ((b.day_order || 0) !== (a.day_order || 0)) return (b.day_order || 0) - (a.day_order || 0);
      if ((a.exercise_order || 999) !== (b.exercise_order || 999)) return (a.exercise_order || 999) - (b.exercise_order || 999);
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

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

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
      return matchesSearch(video, search);
    });
  }, [videos, search, selectedWeekKeys, weekFilters]);

  const compareVideosBySlot = [0, 1, 2, 3].map(
    (slot) => videos.find((video) => video.id === compareVideoIds[slot]) || null,
  );

  const coachLinks: DashboardLink[] = [
    { href: "/dashboard", icon: "🏠", title: "Dashboard", description: "Ga terug naar het dashboard." },
    { href: "/athletes", icon: "👥", title: "Atleten beheren", description: "Bekijk en accepteer atleten.", badge: pendingCount },
    { href: "/athlete-profiles", icon: "📋", title: "Atleten profielen", description: "Bekijk alle geaccepteerde atleten." },
    { href: "/programs", icon: "🏋️", title: "Programma’s", description: "Maak trainingsschema’s aan." },
    { href: "/video-gallery", icon: "🎥", title: "Video gallery", description: "Bekijk alle video's" },
    { href: "/statistics", icon: "📈", title: "Statistics", description: "Bekijk statistieken en grafieken." },
    { href: "/chat", icon: "💬", title: "Chat", description: "Stuur berichten naar atleten." },
    { href: "/wedstrijd-kalender", icon: "📅", title: "Wedstrijd kalender", description: "Bekijk en beheer wedstrijden." },
    { href: "/limitless-data", icon: "📊", title: "Limitless Data", description: "Voeg atleten toe en beheer lidgegevens." },
    { href: "/leaderboard", icon: "🏆", title: "Leaderboard", description: "Bekijk rankings en prestaties." },
  ];

  const athleteLinks: DashboardLink[] = [
    { href: "/dashboard", icon: "🏠", title: "Dashboard", description: "Ga terug naar het dashboard." },
    { href: "/training", icon: "🔥", title: "Mijn training", description: "Bekijk je training van vandaag." },
    { href: "/progress", icon: "📈", title: "Voortgang", description: "Bekijk je resultaten." },
    { href: "/programs", icon: "🏋️", title: "Programma’s", description: "Bekijk je trainingsprogramma’s." },
    { href: "/chat", icon: "💬", title: "Chat met coach", description: "Stel vragen aan je coach." },
    { href: "/wedstrijd-kalender", icon: "📅", title: "Wedstrijd kalender", description: "Bekijk je aankomende wedstrijden." },
  ];

  const links = role === "coach" ? coachLinks : athleteLinks;

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

  function renderSidebar() {
    return (
      <aside className="group w-20 hover:w-64 bg-white shadow-xl p-3 flex flex-col transition-all duration-300 overflow-hidden">
        <div className="flex items-center justify-center group-hover:justify-between mb-5 transition-all">
          <button
            onClick={() => (window.location.href = "/profile")}
            className="flex items-center gap-3 bg-gray-100 hover:bg-gray-200 transition rounded-xl px-2 py-2 w-full"
          >
            <div className="min-w-9 h-9 rounded-lg bg-white shadow flex items-center justify-center text-lg">👤</div>

            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden">
              <p className="font-semibold text-sm">{fullName}</p>
              <p className="text-xs text-gray-400 capitalize">Ingelogd als {role}</p>
              <p className="text-xs text-gray-500 mt-1">Profiel aanpassen</p>
            </div>
          </button>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {links.map((item) => {
            const content = (
              <>
                <div className="relative">
                  <div className="min-w-9 h-9 rounded-lg bg-white shadow flex items-center justify-center text-lg">
                    {item.icon}
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow">
                      {item.badge}
                    </div>
                  )}
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden">
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </>
            );

            if (item.href) {
              return (
                <a
                  key={item.title}
                  href={item.href}
                  className="relative bg-gray-100 hover:bg-gray-200 p-3 rounded-xl transition-all duration-200 flex items-center gap-3"
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={item.title}
                onClick={item.action}
                className="relative bg-gray-100 hover:bg-gray-200 p-3 rounded-xl transition-all duration-200 flex items-center gap-3 text-left"
              >
                {content}
              </button>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className="bg-black text-white px-3 py-2 rounded-xl mt-5 flex items-center gap-3 hover:opacity-90 transition"
        >
          <span className="min-w-9 text-lg">🚪</span>
          <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden text-sm">
            Uitloggen
          </span>
        </button>
      </aside>
    );
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
        className={`relative overflow-hidden rounded-2xl bg-black shadow text-left transition ${
          options?.selected ? "ring-4 ring-black" : "hover:scale-[1.01]"
        }`}
      >
        <div className={`${compact ? "aspect-video" : "aspect-[16/27]"} bg-black relative`}>
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
      <div className="min-w-0 rounded-3xl bg-white p-2 shadow-xl">
        <div className="relative mb-3">
          <input
            value={query}
            onChange={(e) => updateCompareSearch(slot, e.target.value)}
            placeholder="Zoek: squat, rpe 7, 5 reps, 120 kg, b1w1"
            className="w-full rounded-2xl border bg-white px-4 py-3 pr-11 text-black outline-none"
          />

          {query && (
            <button
              onClick={() => updateCompareSearch(slot, "")}
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200"
            >
              ×
            </button>
          )}
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
          className={`relative h-[78vh] max-h-[860px] min-h-[620px] overflow-hidden rounded-2xl bg-black ${
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
                className={`absolute right-12 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow ${
                  moveEnabledSlots[slot]
                    ? "bg-white text-black"
                    : "bg-black/70 text-white"
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
                className="absolute right-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-lg font-bold text-white shadow"
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
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-black"
                  >
                    {comparePlayingByVideoId[selectedVideo.id] ? "Ⅱ" : "▶"}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max={compareVideoRefs.current[selectedVideo.id]?.duration || 0}
                    step="0.01"
                    value={compareProgressByVideoId[selectedVideo.id] || 0}
                    onChange={(e) => handleCompareSeek(selectedVideo.id, e.target.value)}
                    className="w-full accent-white"
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

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="flex min-h-screen">
        {renderSidebar()}

        <section className="min-w-0 flex-1 p-6">
          <div className="mb-6 rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <h1 className="text-4xl font-bold text-black">Video galerij</h1>

              <div className="flex flex-col gap-3 md:flex-row">
                <select
                  value={selectedAthleteId}
                  onChange={(e) => setSelectedAthleteId(e.target.value)}
                  className="rounded-xl border bg-white p-3 text-black outline-none"
                >
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.full_name || "Naamloos"}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className="rounded-xl bg-black px-4 py-3 font-semibold text-white"
                >
                  {compareMode ? "Normale view" : "Compare view"}
                </button>

                {compareMode && (
                  <div className="flex rounded-xl bg-gray-100 p-1">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        onClick={() => setCompareCount(count as 2 | 3 | 4)}
                        className={`rounded-lg px-4 py-2 text-sm font-bold ${
                          compareCount === count ? "bg-black text-white" : "text-black"
                        }`}
                      >
                        {count} compare
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!compareMode && (
              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_2fr]">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700">Block / week filter</label>

                    <button
                      onClick={toggleAllWeeks}
                      className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-black hover:bg-gray-200"
                    >
                      {selectedWeekKeys.length === weekFilters.length ? "Alles uit" : "Alles aan"}
                    </button>
                  </div>

                  <div className="max-h-[168px] overflow-y-auto rounded-2xl border bg-gray-50 p-3">
                    {weekFilters.map((filter) => (
                      <label
                        key={filter.key}
                        className="mb-2 flex cursor-pointer items-center gap-3 rounded-xl bg-white p-3 text-sm font-semibold text-black shadow-sm last:mb-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedWeekKeys.includes(filter.key)}
                          onChange={() => toggleWeek(filter.key)}
                          className="h-4 w-4 accent-black"
                        />
                        {filter.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">Zoeken</label>

                  <div className="relative">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Zoek bijv. squat, rpe 7, 5 reps, 120 kg, block 1, b1w1"
                      className="w-full rounded-2xl border bg-white px-4 py-3 pr-11 text-black outline-none"
                    />

                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="rounded-3xl bg-white p-8 text-center text-gray-500 shadow-xl">Laden...</div>
          ) : loadingVideos ? (
            <div className="rounded-3xl bg-white p-8 text-center text-gray-500 shadow-xl">Video&apos;s laden...</div>
          ) : compareMode ? (
            <div
              className={`grid gap-2 overflow-x-auto ${
                compareCount === 4 ? "grid-cols-4" : compareCount === 3 ? "grid-cols-3" : "grid-cols-2"
              }`}
            >
              {renderComparePane(0)}
              {renderComparePane(1)}
              {compareCount >= 3 && renderComparePane(2)}
              {compareCount >= 4 && renderComparePane(3)}
            </div>
          ) : visibleVideos.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center text-gray-500 shadow-xl">Geen video&apos;s gevonden.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {visibleVideos.map((video) => renderVideoCard(video))}
            </div>
          )}
        </section>
      </div>

      {fullscreenVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
          <button
            onClick={() => setFullscreenVideo(null)}
            className="absolute right-5 top-5 rounded-full bg-white/10 px-4 py-2 font-bold text-white"
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
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{fullscreenVideo.exercise_name}</h2>

                <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">
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
    </main>
  );
}
