export type StatisticsChartCategory =
  | "e1rm"
  | "bw"
  | "checkin"
  | "gl"
  | "volume"
  | "intensity"
  | "progression";

export type StatisticsChartId =
  | "e1rm_all"
  | "e1rm_squat"
  | "e1rm_bench"
  | "e1rm_deadlift"
  | "bw"
  | "fatigue"
  | "recovery"
  | "gl_points_sbd"
  | "gl_points_total"
  | "sets_per_exercise"
  | "reps_per_exercise"
  | "avg_intensity_squat"
  | "avg_intensity_bench"
  | "avg_intensity_deadlift"
  | "peak_intensity_squat"
  | "peak_intensity_bench"
  | "peak_intensity_deadlift"
  | "load_progression_squat"
  | "load_progression_bench"
  | "load_progression_deadlift"
  | "tonnage_squat"
  | "tonnage_bench"
  | "tonnage_deadlift"
  | "tonnage_exercise";

export type StatisticsChartCatalogEntry = {
  id: StatisticsChartId;
  label: string;
  description: string;
  category: StatisticsChartCategory;
  expandsPerExercise?: boolean;
};

export const STATISTICS_CHART_CATALOG: StatisticsChartCatalogEntry[] = [
  {
    id: "e1rm_all",
    label: "e1RM — alle lifts",
    description: "Squat, bench en deadlift in één grafiek",
    category: "e1rm",
  },
  {
    id: "e1rm_squat",
    label: "e1RM — Squat",
    description: "Hoogste geschatte 1RM per week",
    category: "e1rm",
  },
  {
    id: "e1rm_bench",
    label: "e1RM — Bench",
    description: "Hoogste geschatte 1RM per week",
    category: "e1rm",
  },
  {
    id: "e1rm_deadlift",
    label: "e1RM — Deadlift",
    description: "Hoogste geschatte 1RM per week",
    category: "e1rm",
  },
  {
    id: "bw",
    label: "Lichaamsgewicht",
    description: "Gemiddeld BW per programmaweek",
    category: "checkin",
  },
  {
    id: "fatigue",
    label: "Fatigue score",
    description: "Pre-training fatigue uit check-ins",
    category: "checkin",
  },
  {
    id: "recovery",
    label: "Herstel score",
    description: "Pre-training herstel uit check-ins",
    category: "checkin",
  },
  {
    id: "gl_points_sbd",
    label: "GL Points — SBD",
    description: "Geschatte GL points per lift per week",
    category: "gl",
  },
  {
    id: "gl_points_total",
    label: "GL Points — Totaal",
    description: "Geschatte GL points op SBD-totaal per week",
    category: "gl",
  },
  {
    id: "sets_per_exercise",
    label: "Sets per oefening",
    description: "Staafgrafiek voor één gekozen oefening",
    category: "volume",
    expandsPerExercise: true,
  },
  {
    id: "reps_per_exercise",
    label: "Reps per oefening",
    description: "Staafgrafiek voor één gekozen oefening",
    category: "volume",
    expandsPerExercise: true,
  },
  {
    id: "avg_intensity_squat",
    label: "Gem. intensiteit — Squat",
    description: "Gemiddelde RPE en % per week",
    category: "intensity",
  },
  {
    id: "avg_intensity_bench",
    label: "Gem. intensiteit — Bench",
    description: "Gemiddelde RPE en % per week",
    category: "intensity",
  },
  {
    id: "avg_intensity_deadlift",
    label: "Gem. intensiteit — Deadlift",
    description: "Gemiddelde RPE en % per week",
    category: "intensity",
  },
  {
    id: "peak_intensity_squat",
    label: "Piekinstensiteit — Squat",
    description: "Hoogste RPE en % per week",
    category: "intensity",
  },
  {
    id: "peak_intensity_bench",
    label: "Piekinstensiteit — Bench",
    description: "Hoogste RPE en % per week",
    category: "intensity",
  },
  {
    id: "peak_intensity_deadlift",
    label: "Piekinstensiteit — Deadlift",
    description: "Hoogste RPE en % per week",
    category: "intensity",
  },
  {
    id: "load_progression_squat",
    label: "Load progression — Squat",
    description: "Zwaarste gewicht per week",
    category: "progression",
  },
  {
    id: "load_progression_bench",
    label: "Load progression — Bench",
    description: "Zwaarste gewicht per week",
    category: "progression",
  },
  {
    id: "load_progression_deadlift",
    label: "Load progression — Deadlift",
    description: "Zwaarste gewicht per week",
    category: "progression",
  },
  {
    id: "tonnage_squat",
    label: "Tonnage — Squat",
    description: "Totaal volume (kg) per week",
    category: "volume",
  },
  {
    id: "tonnage_bench",
    label: "Tonnage — Bench",
    description: "Totaal volume (kg) per week",
    category: "volume",
  },
  {
    id: "tonnage_deadlift",
    label: "Tonnage — Deadlift",
    description: "Totaal volume (kg) per week",
    category: "volume",
  },
  {
    id: "tonnage_exercise",
    label: "Tonnage — oefening",
    description: "Totaal volume (kg) per week voor een gekozen oefening",
    category: "volume",
    expandsPerExercise: true,
  },
];

export const DEFAULT_ENABLED_CHARTS: StatisticsChartId[] = [
  "e1rm_all",
  "e1rm_squat",
  "e1rm_bench",
  "e1rm_deadlift",
  "bw",
];

const STORAGE_KEY = "statistics-enabled-charts-v1";

export function loadEnabledCharts(): StatisticsChartId[] {
  if (typeof window === "undefined") {
    return DEFAULT_ENABLED_CHARTS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ENABLED_CHARTS;

    const parsed = JSON.parse(raw) as string[];
    const valid = new Set(STATISTICS_CHART_CATALOG.map((entry) => entry.id));
    const filtered = parsed.filter((id): id is StatisticsChartId =>
      valid.has(id as StatisticsChartId),
    );

    return filtered.length > 0 ? filtered : DEFAULT_ENABLED_CHARTS;
  } catch {
    return DEFAULT_ENABLED_CHARTS;
  }
}

export function saveEnabledCharts(chartIds: StatisticsChartId[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chartIds));
  } catch {
    // Ignore storage errors.
  }
}

export function getChartCatalogEntry(
  id: StatisticsChartId,
): StatisticsChartCatalogEntry | undefined {
  return STATISTICS_CHART_CATALOG.find((entry) => entry.id === id);
}
