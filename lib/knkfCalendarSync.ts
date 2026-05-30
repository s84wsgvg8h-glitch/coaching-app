import type { SupabaseClient } from "@supabase/supabase-js";

export type KnkfCalendarEvent = {
  naam: string;
  start_date: string;
  end_date: string;
};

const KNKF_CALENDAR_URL = "https://knkf-sectiepowerliften.nl/kalender/";

function parseDateCell(raw: string): { start_date: string; end_date: string } | null {
  const trimmed = raw.trim();
  const rangeMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})(\d{4}-\d{2}-\d{2})$/,
  );

  if (rangeMatch) {
    return {
      start_date: rangeMatch[1]!,
      end_date: rangeMatch[2]!,
    };
  }

  const singleMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (singleMatch) {
    return {
      start_date: singleMatch[1]!,
      end_date: singleMatch[1]!,
    };
  }

  return null;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCompetitionName(cellHtml: string) {
  const linkMatch = cellHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
  const rawName = linkMatch ? stripHtml(linkMatch[1]!) : stripHtml(cellHtml);
  const cleaned = rawName
    .replace(/\s*Powerliften[\s\S]*$/i, "")
    .replace(/\s*Deadliften[\s\S]*$/i, "")
    .replace(/\s*Bankdrukken[\s\S]*$/i, "")
    .replace(/\s*👑[\s\S]*$/i, "")
    .trim();

  return cleaned || rawName;
}

export function parseKnkfCalendarHtml(html: string): KnkfCalendarEvent[] {
  const events: KnkfCalendarEvent[] = [];
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1]!;
    if (!rowHtml.includes("<td")) continue;

    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (match) => match[1]!.trim(),
    );

    if (cells.length < 2) continue;

    const dates = parseDateCell(stripHtml(cells[0]!));
    if (!dates) continue;

    const naam = extractCompetitionName(cells[1]!);
    if (!naam) continue;

    events.push({
      naam,
      start_date: dates.start_date,
      end_date: dates.end_date,
    });
  }

  return events;
}

export async function fetchKnkfCalendarEvents(): Promise<KnkfCalendarEvent[]> {
  const response = await fetch(KNKF_CALENDAR_URL, {
    headers: {
      "User-Agent": "LimitlessCoachingApp/1.0 (+calendar-sync)",
      Accept: "text/html",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`KNKF kalender ophalen mislukt (${response.status}).`);
  }

  const html = await response.text();
  return parseKnkfCalendarHtml(html);
}

export type KnkfSyncResult = {
  fetched: number;
  inserted: number;
  skipped: number;
};

export async function syncKnkfEventsToSupabase(
  supabase: SupabaseClient,
  events: KnkfCalendarEvent[],
): Promise<KnkfSyncResult> {
  if (events.length === 0) {
    return { fetched: 0, inserted: 0, skipped: 0 };
  }

  const startDates = [...new Set(events.map((event) => event.start_date))];
  const { data: existingRows } = await supabase
    .from("wedstrijden")
    .select("naam, start_date")
    .in("start_date", startDates);

  const existingKeys = new Set(
    (existingRows || []).map(
      (row) => `${row.naam.trim().toLowerCase()}|${row.start_date}`,
    ),
  );

  const toInsert = events.filter((event) => {
    const key = `${event.naam.trim().toLowerCase()}|${event.start_date}`;
    return !existingKeys.has(key);
  });

  if (toInsert.length > 0) {
    const { error } = await supabase.from("wedstrijden").insert(
      toInsert.map((event) => ({
        naam: event.naam,
        datum: event.start_date,
        start_date: event.start_date,
        end_date: event.end_date,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    fetched: events.length,
    inserted: toInsert.length,
    skipped: events.length - toInsert.length,
  };
}
