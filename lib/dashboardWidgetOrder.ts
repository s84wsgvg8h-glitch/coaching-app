const STORAGE_KEY = "coach-dashboard-widget-layout";

export const COACH_WIDGET_CATALOG = {
  welcome: {
    label: "Welkom",
    description: "Begroeting en snelkoppelingen",
    icon: "👋",
  },
  agenda: {
    label: "Agenda",
    description: "Afspraken en kalender",
    icon: "📅",
  },
  search: {
    label: "Zoeken",
    description: "Zoek in app en kennisbank",
    icon: "🔍",
  },
  invites: {
    label: "Uitnodigingen",
    description: "Atleet-uitnodigingslinks",
    icon: "🔗",
  },
  income: {
    label: "Inkomsten",
    description: "Maandelijkse inkomsten",
    icon: "💰",
  },
  pending: {
    label: "Aanmeldingen",
    description: "Openstaande atleet-aanmeldingen",
    icon: "⏳",
  },
  todo: {
    label: "To-do",
    description: "Openstaande coach-taken",
    icon: "✅",
  },
  athletes: {
    label: "Atleten",
    description: "Compact overzicht van je atleten",
    icon: "👥",
  },
  quicklinks: {
    label: "Snelkoppelingen",
    description: "Programs, data, leaderboard",
    icon: "⚡",
  },
} as const;

export type CoachWidgetId = keyof typeof COACH_WIDGET_CATALOG;
export type CoachWidgetWidth = "full" | "half" | "third";

export type CoachWidgetLayoutItem = {
  id: CoachWidgetId;
  width: CoachWidgetWidth;
};

const DEFAULT_LAYOUT: CoachWidgetLayoutItem[] = [
  { id: "welcome", width: "full" },
  { id: "agenda", width: "full" },
  { id: "search", width: "half" },
  { id: "invites", width: "half" },
  { id: "income", width: "third" },
];

export function loadCoachWidgetLayout(): CoachWidgetLayoutItem[] {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;

    const parsed = JSON.parse(raw) as CoachWidgetLayoutItem[];
    const valid = parsed.filter(
      (item) =>
        item?.id &&
        item.id in COACH_WIDGET_CATALOG &&
        (item.width === "full" ||
          item.width === "half" ||
          item.width === "third"),
    );

    if (valid.length === 0) return DEFAULT_LAYOUT;
    return valid;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveCoachWidgetLayout(layout: CoachWidgetLayoutItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export function widgetWidthClass(width: CoachWidgetWidth) {
  switch (width) {
    case "half":
      return "md:col-span-6";
    case "third":
      return "md:col-span-4";
    default:
      return "md:col-span-12";
  }
}

export function availableWidgetsToAdd(
  layout: CoachWidgetLayoutItem[],
): CoachWidgetId[] {
  const used = new Set(layout.map((item) => item.id));
  return (Object.keys(COACH_WIDGET_CATALOG) as CoachWidgetId[]).filter(
    (id) => !used.has(id),
  );
}

/** @deprecated use loadCoachWidgetLayout */
export const DEFAULT_COACH_WIDGETS = DEFAULT_LAYOUT.map((item) => item.id);
export function loadCoachWidgetOrder(): CoachWidgetId[] {
  return loadCoachWidgetLayout().map((item) => item.id);
}
export function saveCoachWidgetOrder(order: CoachWidgetId[]) {
  const current = loadCoachWidgetLayout();
  const byId = new Map(current.map((item) => [item.id, item]));
  saveCoachWidgetLayout(
    order.map(
      (id) => byId.get(id) || { id, width: "full" as CoachWidgetWidth },
    ),
  );
}
