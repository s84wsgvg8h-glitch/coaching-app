const STORAGE_KEY = "coach-dashboard-widget-layout";
export const DASHBOARD_LAYOUT_VERSION = 10;

export const COACH_WIDGET_CATALOG = {
  apps: {
    label: "Apps",
    description: "Snelkoppelingen naar chat, to-do, atleten en meer",
    icon: "📱",
  },
  engagement: {
    label: "Team betrokkenheid",
    description: "Engagement score van je team",
    icon: "📈",
  },
  todaysFocusPanel: {
    label: "Focus vandaag",
    description: "Afspraken en taken voor vandaag",
    icon: "🎯",
  },
  athleteCountMetric: {
    label: "Atleten teller",
    description: "Aantal atleten en actieve atleten",
    icon: "👥",
  },
  agenda: {
    label: "Snelle agenda",
    description: "Agenda-overzicht van vandaag",
    icon: "📅",
  },
  welcome: {
    label: "Welkom",
    description: "Compacte begroeting met samenvatting",
    icon: "👋",
  },
  focus: {
    label: "Focus vandaag",
    description: "Atleten en acties die vandaag aandacht vragen",
    icon: "🎯",
  },
  kpi: {
    label: "KPI's",
    description: "Atleten, check-ins, berichten, wedstrijden",
    icon: "📊",
  },
  inbox: {
    label: "Coach-inbox",
    description: "Actiegerichte openstaande items",
    icon: "📥",
  },
  activity: {
    label: "Recente activiteit",
    description: "Chronologische feed van atleten",
    icon: "⚡",
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
  copilot: {
    label: "AI Copilot",
    description: "Weekdigest en team-inzichten",
    icon: "🤖",
  },
  alerts: {
    label: "Waarschuwingen",
    description: "Periodisatie waarschuwingen",
    icon: "⚠️",
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
  leaderboard: {
    label: "Leaderboard",
    description: "Rankings en prestaties",
    icon: "🏆",
  },
  bwTrends: {
    label: "Lichaamsgewicht",
    description: "Lichaamsgewicht trends (binnenkort)",
    icon: "📉",
  },
  newVideos: {
    label: "Nieuwe video's",
    description: "Openstaande video reviews",
    icon: "🎥",
  },
} as const;

export type CoachWidgetId = keyof typeof COACH_WIDGET_CATALOG;
export type CoachWidgetWidth = "full" | "half" | "third";

export type CoachWidgetLayoutItem = {
  id: CoachWidgetId;
  width: CoachWidgetWidth;
};

export type StoredCoachWidgetLayout = {
  version: number;
  items: CoachWidgetLayoutItem[];
};

export const DEFAULT_COACH_WIDGET_LAYOUT: CoachWidgetLayoutItem[] = [];

function isValidLayoutItem(item: unknown): item is CoachWidgetLayoutItem {
  if (!item || typeof item !== "object") return false;
  const row = item as CoachWidgetLayoutItem;
  return (
    Boolean(row.id) &&
    row.id in COACH_WIDGET_CATALOG &&
    (row.width === "full" || row.width === "half" || row.width === "third")
  );
}

export function sanitizeLayout(items: unknown): CoachWidgetLayoutItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter(isValidLayoutItem);
}

export function isModernLayout(items: CoachWidgetLayoutItem[]) {
  const ids = new Set(items.map((item) => item.id));
  return ids.has("apps") || ids.has("todaysFocusPanel") || ids.has("focus");
}

export const FIXED_WIDTH_WIDGETS = new Set<CoachWidgetId>([
  "apps",
  "engagement",
  "athleteCountMetric",
  "todaysFocusPanel",
  "agenda",
]);

export function widgetGridClass(id: CoachWidgetId, width: CoachWidgetWidth) {
  switch (id) {
    case "apps":
      return "col-span-12";
    case "engagement":
    case "athleteCountMetric":
      return "col-span-12 w-full max-w-[var(--dashboard-metric-size)] md:col-span-4 lg:col-span-3 xl:col-span-2";
    case "todaysFocusPanel":
      return "col-span-12 w-full max-w-[var(--dashboard-focus-width)]";
    case "agenda":
      return "col-span-12";
    default:
      return `col-span-12 ${widgetWidthClass(width)}`;
  }
}

function parseStoredLayout(raw: string | null): StoredCoachWidgetLayout | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      const items = sanitizeLayout(parsed);
      return items.length > 0 ? { version: 1, items } : null;
    }

    if (parsed && typeof parsed === "object") {
      const record = parsed as Partial<StoredCoachWidgetLayout>;
      const items = sanitizeLayout(record.items);
      if (items.length === 0) return null;
      return {
        version:
          typeof record.version === "number"
            ? record.version
            : DASHBOARD_LAYOUT_VERSION,
        items,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveCoachWidgetLayout(
  stored: StoredCoachWidgetLayout | CoachWidgetLayoutItem[] | null | undefined,
): CoachWidgetLayoutItem[] {
  const items = sanitizeLayout(
    Array.isArray(stored) ? stored : stored?.items,
  );
  return items;
}

export function wrapCoachWidgetLayout(
  items: CoachWidgetLayoutItem[],
): StoredCoachWidgetLayout {
  return {
    version: DASHBOARD_LAYOUT_VERSION,
    items,
  };
}

export function loadCoachWidgetLayout(): CoachWidgetLayoutItem[] {
  if (typeof window === "undefined") return DEFAULT_COACH_WIDGET_LAYOUT;

  const stored = parseStoredLayout(localStorage.getItem(STORAGE_KEY));
  const resolved = resolveCoachWidgetLayout(stored);

  if (
    !stored ||
    stored.version < DASHBOARD_LAYOUT_VERSION ||
    JSON.stringify(stored.items) !== JSON.stringify(resolved)
  ) {
    saveCoachWidgetLayout(resolved);
  }

  return resolved;
}

export function saveCoachWidgetLayout(layout: CoachWidgetLayoutItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(wrapCoachWidgetLayout(layout)),
  );
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
export const DEFAULT_COACH_WIDGETS = DEFAULT_COACH_WIDGET_LAYOUT.map(
  (item) => item.id,
);
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

export { STORAGE_KEY };
