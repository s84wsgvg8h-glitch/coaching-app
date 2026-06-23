const TODO_SUGGESTIONS: Array<{ prefixes: string[]; template: string }> = [
  {
    prefixes: ["progr", "programma"],
    template: "programma maken voor ",
  },
  {
    prefixes: ["incheck", "check"],
    template: "Inchecken met inactieve atleet: ",
  },
  {
    prefixes: ["video", "review"],
    template: "Video reviewen voor ",
  },
  {
    prefixes: ["feedback"],
    template: "Feedback geven aan ",
  },
  {
    prefixes: ["intake"],
    template: "Intake afronden voor ",
  },
  {
    prefixes: ["betaling", "betal"],
    template: "Betaling opvolgen voor ",
  },
];

const ATHLETE_NAME_TEMPLATES = [
  "programma maken voor ",
  "video reviewen voor ",
  "feedback geven aan ",
  "intake afronden voor ",
  "betaling opvolgen voor ",
];

type AthleteOption = { id: string; full_name: string | null };

function normalizeAthleteName(athlete: AthleteOption) {
  return athlete.full_name?.trim() || "Atleet";
}

export function getTodoTitleSuggestions(
  input: string,
  athletes: AthleteOption[] = [],
  limit = 6,
) {
  const trimmed = input.trim();
  const query = trimmed.toLowerCase();
  if (query.length < 2) return [] as string[];

  for (const prefix of ATHLETE_NAME_TEMPLATES) {
    if (query.startsWith(prefix)) {
      const nameQuery = trimmed.slice(prefix.length).trim().toLowerCase();
      return athletes
        .filter((athlete) => {
          const name = normalizeAthleteName(athlete).toLowerCase();
          if (!nameQuery) return true;
          return name.includes(nameQuery) || name.startsWith(nameQuery);
        })
        .map((athlete) => `${prefix}${normalizeAthleteName(athlete)}`)
        .slice(0, limit);
    }
  }

  const matches = TODO_SUGGESTIONS.filter((entry) =>
    entry.prefixes.some(
      (prefix) => prefix.startsWith(query) || query.startsWith(prefix),
    ),
  ).map((entry) => entry.template);

  return [...new Set(matches)].slice(0, limit);
}

export function resolveAthleteIdFromTodoTitle(
  title: string,
  athletes: AthleteOption[],
): string | null {
  const trimmed = title.trim();
  const lower = trimmed.toLowerCase();

  for (const prefix of ATHLETE_NAME_TEMPLATES) {
    if (!lower.startsWith(prefix)) continue;

    const namePart = trimmed.slice(prefix.length).trim().toLowerCase();
    if (!namePart) return null;

    const match = athletes.find(
      (athlete) => normalizeAthleteName(athlete).toLowerCase() === namePart,
    );
    return match?.id || null;
  }

  return null;
}
