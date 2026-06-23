import type { AthleteUpcomingCompetition } from "@/lib/competitions";

function escapeIcs(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsDate(dateStr: string) {
  return dateStr.replace(/-/g, "");
}

export function buildCompetitionsIcs(
  competitions: AthleteUpcomingCompetition[],
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Limitless Coaching//NL",
    "CALSCALE:GREGORIAN",
  ];

  for (const comp of competitions) {
    const descriptionParts = [
      comp.goals ? `Doelen: ${comp.goals}` : null,
      comp.coachNotes ? `Coach: ${comp.coachNotes}` : null,
    ].filter(Boolean);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:meet-${comp.id}@limitless-coaching`);
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(comp.start_date)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(comp.end_date)}`);
    lines.push(`SUMMARY:${escapeIcs(comp.naam)}`);
    if (descriptionParts.length > 0) {
      lines.push(`DESCRIPTION:${escapeIcs(descriptionParts.join("\n"))}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadIcsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
