import { supabase } from "@/lib/supabaseClient";
import { getNavLinks } from "@/lib/navigation";
import { isCoachLikeRole } from "@/lib/authRoles";
import { getDemoPages } from "@/lib/demo/demoPages";
import { getDemoPersona, isDemoMode } from "@/lib/demo/demoMode";
import { buildProgramWeekPath, resolveProgramEntryForAthlete } from "@/lib/programNavigation";
import {
  applyAthleteScope,
  loadCoachOrgContext,
} from "@/lib/orgAthleteScope";

import {
  formatPaymentDayFieldValue,
  formatPaymentPrice,
  formatPaymentPriceFieldValue,
} from "@/lib/athletePayments";
import { formatOptionalTextFieldInputValue } from "@/lib/optionalFieldDash";

export type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  group: string;
  keywords?: string;
};

export type CommandProgramRow = {
  athleteId: string;
  athleteName: string;
  href: string;
  label: string;
};

export type CommandAthleteDetail = {
  id: string;
  fullName: string;
  geboortedatum: string | null;
  lidnummer: string | null;
  betalingPrijs: number | null;
  betalingDag: number | null;
};

export type AthletePickerMode =
  | "programma"
  | "chat"
  | "prijs"
  | "lidnummer"
  | "geboortedatum"
  | "betaaldag";

const ATHLETE_PICKER_PREFIXES: Record<AthletePickerMode, string> = {
  programma: "programma",
  chat: "chat",
  prijs: "prijs",
  lidnummer: "lidnummer",
  geboortedatum: "geboortedatum",
  betaaldag: "betaaldag",
};

export const ATHLETE_INFO_PICKER_MODES = [
  "prijs",
  "lidnummer",
  "geboortedatum",
  "betaaldag",
] as const;

export type AthleteInfoPickerMode = (typeof ATHLETE_INFO_PICKER_MODES)[number];

export function athletePickerPrefix(mode: AthletePickerMode) {
  return ATHLETE_PICKER_PREFIXES[mode];
}

export function parsePickerCommandItemId(id: string): AthletePickerMode | null {
  if (!id.startsWith("picker-")) return null;
  const mode = id.slice("picker-".length);
  return mode in ATHLETE_PICKER_PREFIXES ? (mode as AthletePickerMode) : null;
}

export function buildCoachAthleteInfoQuickActions(): CommandItem[] {
  return ATHLETE_INFO_PICKER_MODES.map((mode) => ({
    id: `picker-${mode}`,
    label: athletePickerInfoLabel(mode),
    hint: "Kies een atleet",
    group: "Snelle acties",
    keywords: `${ATHLETE_PICKER_PREFIXES[mode]} atleet zoeken`,
  }));
}

export function parseAthletePickerMode(query: string): AthletePickerMode | null {
  const normalized = query.trim().toLowerCase();
  for (const mode of Object.keys(ATHLETE_PICKER_PREFIXES) as AthletePickerMode[]) {
    if (normalized.startsWith(ATHLETE_PICKER_PREFIXES[mode])) {
      return mode;
    }
  }
  return null;
}

export function isAthleteInfoPickerMode(
  mode: AthletePickerMode | null,
): mode is AthleteInfoPickerMode {
  return mode !== null && ATHLETE_INFO_PICKER_MODES.includes(mode as AthleteInfoPickerMode);
}

function formatBirthDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function athletePickerInfoLabel(mode: AthleteInfoPickerMode) {
  switch (mode) {
    case "prijs":
      return "Prijs";
    case "lidnummer":
      return "Lidnummer";
    case "geboortedatum":
      return "Geboortedatum";
    case "betaaldag":
      return "Betaaldag";
  }
}

export function formatAthletePickerInfoValue(
  mode: AthleteInfoPickerMode,
  athlete: CommandAthleteDetail,
) {
  switch (mode) {
    case "prijs":
      return formatPaymentPrice(athlete.betalingPrijs);
    case "lidnummer":
      return athlete.lidnummer?.trim() || "—";
    case "geboortedatum":
      return formatBirthDate(athlete.geboortedatum);
    case "betaaldag":
      return athlete.betalingDag !== null ? `Dag ${athlete.betalingDag}` : "—";
  }
}

export function athleteInfoEditInitialValue(
  mode: AthleteInfoPickerMode,
  athlete: CommandAthleteDetail,
) {
  switch (mode) {
    case "prijs":
      return formatPaymentPriceFieldValue(athlete.betalingPrijs);
    case "lidnummer":
      return formatOptionalTextFieldInputValue(athlete.lidnummer);
    case "geboortedatum":
      return athlete.geboortedatum ?? "";
    case "betaaldag":
      return formatPaymentDayFieldValue(athlete.betalingPrijs, athlete.betalingDag);
  }
}

export function athleteInfoEditInputType(mode: AthleteInfoPickerMode) {
  switch (mode) {
    case "geboortedatum":
      return "date" as const;
    case "prijs":
    case "betaaldag":
      return "number" as const;
    default:
      return "text" as const;
  }
}

export function filterAthletePickerItems(
  items: CommandItem[],
  query: string,
  mode: AthletePickerMode,
) {
  const normalized = query.trim().toLowerCase();
  const prefix = ATHLETE_PICKER_PREFIXES[mode];
  const nameQuery = normalized.startsWith(prefix)
    ? normalized.slice(prefix.length).trim()
    : normalized;

  let base: CommandItem[];

  if (mode === "programma") {
    base = items
      .filter((item) => item.group === "Programma's")
      .map((item) => ({
        ...item,
        label: programAthleteDisplayName(item.label),
      }));
  } else if (mode === "chat") {
    base = items
      .filter((item) => item.group === "Atleten")
      .map((item) => {
        const athleteId = item.id.replace(/^athlete-/, "");
        return {
          ...item,
          hint: "Chat openen",
          href: `/chat?athlete=${athleteId}&from=${encodeURIComponent("/dashboard")}`,
        } satisfies CommandItem;
      });
  } else {
    base = items.filter((item) => item.group === "Atleten");
  }

  if (!nameQuery) return base;

  return base.filter((item) => {
    const haystack = [item.label, item.hint, item.keywords]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(nameQuery);
  });
}

export function filterProgramAthleteItems(items: CommandItem[], query: string) {
  return filterAthletePickerItems(items, query, "programma");
}

export function programAthleteDisplayName(label: string) {
  return label.replace(/^Programma — /, "");
}

export function filterChatAthleteItems(items: CommandItem[], query: string) {
  return filterAthletePickerItems(items, query, "chat");
}

export function filterCommandItems(items: CommandItem[], query: string) {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return items;

  return items.filter((item) => {
    const haystack = [item.label, item.hint, item.keywords, item.group]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export async function loadCommandPaletteData(
  userId: string,
  role: string | null | undefined,
) {
  if (!userId) {
    return {
      athletes: [] as Array<{ id: string; full_name: string | null }>,
      athleteDetails: [] as CommandAthleteDetail[],
      programs: [] as CommandProgramRow[],
      athleteProgramHref: null as string | null,
    };
  }

  if (role === "atleet") {
    const { data: entry } = await resolveProgramEntryForAthlete(userId, userId);
    return {
      athletes: [],
      athleteDetails: [],
      programs: [],
      athleteProgramHref: entry ? buildProgramWeekPath(entry) : "/programs",
    };
  }

  if (!isCoachLikeRole(role)) {
    return { athletes: [], athleteDetails: [], programs: [], athleteProgramHref: null };
  }

  const ctx = await loadCoachOrgContext(userId);
  if (!ctx) {
    return { athletes: [], athleteDetails: [], programs: [], athleteProgramHref: null };
  }

  let athleteQuery = supabase
    .from("profiles")
    .select("id, full_name, geboortedatum, lidnummer, betaling_prijs, betaling_dag")
    .eq("role", "atleet")
    .order("full_name", { ascending: true });

  athleteQuery = applyAthleteScope(athleteQuery, ctx);
  const { data } = await athleteQuery;
  const athleteRows = data || [];

  const athleteDetails: CommandAthleteDetail[] = athleteRows.map((athlete) => ({
    id: athlete.id,
    fullName: athlete.full_name || "Atleet",
    geboortedatum: athlete.geboortedatum || null,
    lidnummer: athlete.lidnummer?.trim() || null,
    betalingPrijs:
      athlete.betaling_prijs !== null && athlete.betaling_prijs !== undefined
        ? Number(athlete.betaling_prijs)
        : null,
    betalingDag:
      athlete.betaling_dag !== null && athlete.betaling_dag !== undefined
        ? Number(athlete.betaling_dag)
        : null,
  }));

  const programResults = await Promise.all(
    athleteRows.map(async (athlete) => {
      const { data: entry } = await resolveProgramEntryForAthlete(athlete.id, userId);
      if (!entry) return null;
      return {
        athleteId: athlete.id,
        athleteName: athlete.full_name || "Atleet",
        href: buildProgramWeekPath(entry, { coachViewingAthlete: true }),
        label: `Programma — ${athlete.full_name || "Atleet"}`,
      } satisfies CommandProgramRow;
    }),
  );

  return {
    athletes: athleteRows,
    athleteDetails,
    programs: programResults.filter((row): row is CommandProgramRow => row !== null),
    athleteProgramHref: null,
  };
}

export function buildCommandItems(
  role: string | null | undefined,
  athletes: Array<{ id: string; full_name: string | null }>,
  programs: CommandProgramRow[],
  athleteProgramHref: string | null,
): CommandItem[] {
  const nav = getNavLinks(role || "").map((item) => ({
    id: item.href,
    label: item.title,
    hint: item.description,
    href: item.href,
    group: "Pagina's",
    keywords: item.description,
  }));

  const athleteQuickActions: CommandItem[] =
    role === "atleet"
      ? [
          {
            id: "qa-fill",
            label: "Vandaag invullen",
            hint: "Open je programma van vandaag",
            href: athleteProgramHref || "/programs",
            group: "Snelle acties",
          },
          {
            id: "qa-chat-athlete",
            label: "Open chat",
            href: "/chat",
            group: "Snelle acties",
          },
          {
            id: "qa-data",
            label: "Open data",
            href: "/data",
            group: "Snelle acties",
          },
          {
            id: "qa-todo-athlete",
            label: "Taken & habits",
            href: "/todo",
            group: "Snelle acties",
          },
        ]
      : [];

  const quickActions: CommandItem[] = isCoachLikeRole(role)
    ? [
        {
          id: "qa-dashboard",
          label: "Open dashboard",
          href: "/dashboard",
          group: "Snelle acties",
        },
        {
          id: "qa-chat",
          label: "Open chat",
          href: "/chat",
          group: "Snelle acties",
        },
        {
          id: "qa-todo",
          label: "Nieuwe taak",
          href: "/todo",
          group: "Snelle acties",
        },
        {
          id: "qa-athletes",
          label: "Atleten / uitnodigen",
          href: "/athletes",
          group: "Snelle acties",
        },
        {
          id: "qa-competition",
          label: "Nieuwe wedstrijd",
          href: "/wedstrijd-kalender",
          group: "Snelle acties",
        },
      ]
    : [];

  const athleteItems = athletes.map((athlete) => ({
    id: `athlete-${athlete.id}`,
    label: athlete.full_name || "Atleet",
    hint: "Atleet hub",
    href: `/athletes/${athlete.id}`,
    group: "Atleten",
    keywords: athlete.full_name || undefined,
  }));

  const programItems = programs.map((program) => ({
    id: `program-${program.athleteId}`,
    label: program.label,
    hint: "Programma openen",
    href: program.href,
    group: "Programma's",
    keywords: `${program.athleteName} programma`,
  }));

  const demoBrowseItems: CommandItem[] = isDemoMode()
    ? getDemoPages(getDemoPersona()).map((page) => ({
        id: `demo-${page.href}`,
        label: page.label,
        hint: page.group,
        href: page.href,
        group: "Demo — alle pagina's",
        keywords: page.description,
      }))
    : [];

  const extraCoachPages: CommandItem[] = isCoachLikeRole(role)
    ? [
        { id: "/todo", label: "To-do", href: "/todo", group: "Pagina's" },
        { id: "/athletes", label: "Atleten", href: "/athletes", group: "Pagina's" },
        { id: "/chat", label: "Chat", href: "/chat", group: "Pagina's" },
        { id: "/video-review", label: "Video review", href: "/video-review", group: "Pagina's" },
        { id: "/planning", label: "Planning", href: "/planning", group: "Pagina's" },
        { id: "/programs-nav", label: "Programma's", href: "/programs", group: "Pagina's" },
        { id: "/meet-week", label: "Meet-week", href: "/meet-week", group: "Pagina's" },
        { id: "/betalingen", label: "Betalingen", href: "/betalingen", group: "Pagina's" },
        { id: "/agenda", label: "Agenda", href: "/agenda", group: "Pagina's" },
      ]
    : [];

  const extraAthletePages: CommandItem[] =
    role === "atleet"
      ? [
          { id: "/programs", label: "Programma", href: "/programs", group: "Pagina's" },
          { id: "/chat-athlete", label: "Chat", href: "/chat", group: "Pagina's" },
          { id: "/data-athlete", label: "Data", href: "/data", group: "Pagina's" },
          { id: "/invulscore", label: "Invulscore", href: "/invulscore", group: "Pagina's" },
          { id: "/video-gallery", label: "Video", href: "/video-gallery", group: "Pagina's" },
          { id: "/kennisbank-athlete", label: "Kennisbank", href: "/kennisbank", group: "Pagina's" },
          { id: "/meet-week", label: "Meet-week", href: "/meet-week", group: "Pagina's" },
          { id: "/merch", label: "Merch", href: "/merch", group: "Pagina's" },
          {
            id: "/leaderboard-athlete",
            label: "Leaderboard",
            href: "/leaderboard",
            group: "Pagina's",
          },
          { id: "/doelen", label: "Doelen", href: "/doelen", group: "Pagina's" },
        ]
      : [];

  const mergedNav: CommandItem[] = [...nav];
  for (const extra of [...extraCoachPages, ...extraAthletePages]) {
    if (!mergedNav.some((item) => item.href === extra.href)) {
      mergedNav.push(extra);
    }
  }

  return [
    ...athleteQuickActions,
    ...quickActions,
    ...demoBrowseItems,
    ...mergedNav,
    ...athleteItems,
    ...programItems,
  ];
}
