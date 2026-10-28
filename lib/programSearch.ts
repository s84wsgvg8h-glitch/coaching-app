import { withPreserveWeekParam } from "@/lib/programNavigation";

export type ProgramSearchExercise = {
  id: string;
  name: string;
  dayTitle: string;
  weekTitle: string;
};

export type ProgramSearchWeek = {
  id: string;
  title: string;
  weekNumber: number;
};

export type ProgramSearchBlock = {
  id: string;
  title: string;
};

export type ProgramSearchContext = {
  athleteId?: string;
  athleteName?: string;
  athletes?: Array<{ id: string; name: string }>;
  block?: ProgramSearchBlock;
  week?: ProgramSearchWeek;
  weeks?: ProgramSearchWeek[];
  exercises?: ProgramSearchExercise[];
};

export type ProgramSearchItem = {
  id: string;
  title: string;
  description: string;
  kind: "exercise" | "week" | "page" | "athlete";
  href?: string;
  anchorId?: string;
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function buildProgramSearchItems(
  context: ProgramSearchContext,
): ProgramSearchItem[] {
  const items: ProgramSearchItem[] = [];

  if (context.athleteId) {
    items.push({
      id: `athlete:${context.athleteId}`,
      title: context.athleteName || "Atleet",
      description: "Atleetprofiel",
      kind: "athlete",
      href: `/profile/${context.athleteId}`,
    });
  }

  (context.athletes || []).forEach((athlete) => {
    items.push({
      id: `athlete:${athlete.id}`,
      title: athlete.name,
      description: "Open programma",
      kind: "athlete",
      href: `/programs?athlete=${athlete.id}`,
    });
  });

  if (context.block && context.week) {
    items.push({
      id: "page:programs",
      title: "Alle programma's",
      description: "Terug naar atletenoverzicht",
      kind: "page",
      href: context.athleteId
        ? `/programs?athlete=${context.athleteId}`
        : "/programs",
    });

    items.push({
      id: `week:${context.week.id}`,
      title: `${context.block.title} · ${context.week.title}`,
      description: "Huidige week",
      kind: "week",
      href: withPreserveWeekParam(
        `/programs/${context.block.id}/weeks/${context.week.id}${
          context.athleteId ? `?athlete=${context.athleteId}` : ""
        }`,
      ),
    });
  }

  (context.weeks || []).forEach((week) => {
    if (!context.block || week.id === context.week?.id) return;

    items.push({
      id: `week:${week.id}`,
      title: week.title,
      description: `Week ${week.weekNumber}`,
      kind: "week",
      href: withPreserveWeekParam(
        `/programs/${context.block!.id}/weeks/${week.id}${
          context.athleteId ? `?athlete=${context.athleteId}` : ""
        }`,
      ),
    });
  });

  (context.exercises || []).forEach((exercise) => {
    items.push({
      id: `exercise:${exercise.id}`,
      title: exercise.name,
      description: `${exercise.weekTitle} · ${exercise.dayTitle}`,
      kind: "exercise",
      anchorId: `exercise-${exercise.id}`,
    });
  });

  return items;
}

export function filterProgramSearchItems(
  items: ProgramSearchItem[],
  query: string,
) {
  const trimmed = query.trim();
  if (!trimmed) return items.slice(0, 12);

  const normalizedQuery = normalize(trimmed);

  return items
    .filter((item) => {
      const haystack = normalize(`${item.title} ${item.description}`);
      return haystack.includes(normalizedQuery);
    })
    .slice(0, 12);
}

export function formatProgramContextForAi(context: ProgramSearchContext) {
  const lines: string[] = [];

  if (context.athleteName) {
    lines.push(`Atleet: ${context.athleteName}`);
  }

  if (context.block && context.week) {
    lines.push(`Block: ${context.block.title}`);
    lines.push(`Week: ${context.week.title} (week ${context.week.weekNumber})`);
  }

  if (context.exercises?.length) {
    lines.push("Oefeningen in huidige week:");
    context.exercises.slice(0, 40).forEach((exercise) => {
      lines.push(`- ${exercise.dayTitle}: ${exercise.name}`);
    });
  }

  return lines.join("\n");
}
