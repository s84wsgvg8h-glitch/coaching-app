import type { CoachAthleteOverviewRow } from "@/lib/coachAthleteOverview";
import { formatWeeksOutLabel } from "@/lib/meetWeekDisplay";

function escapeCsv(value: string | number | null) {
  const text = value === null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export type AthleteOverviewExportColumn =
  | "fillScore"
  | "bodyweight"
  | "birthDate"
  | "lidnummer"
  | "price"
  | "paymentDay"
  | "weeksOut";

export function downloadAthleteOverviewCsv(
  filtered: CoachAthleteOverviewRow[],
  activeColumn: AthleteOverviewExportColumn,
  columnLabel: string,
) {
  const header = ["Naam", columnLabel];
  const lines = filtered.map((row) =>
    [
      escapeCsv(row.fullName),
      (() => {
        switch (activeColumn) {
          case "fillScore":
            return escapeCsv(row.fillScore);
          case "bodyweight":
            return escapeCsv(row.bodyweightKg);
          case "birthDate":
            return escapeCsv(row.geboortedatum);
          case "lidnummer":
            return escapeCsv(row.lidnummer);
          case "price":
            return escapeCsv(row.betalingPrijs);
          case "paymentDay":
            return escapeCsv(row.betalingDag);
          case "weeksOut":
            return escapeCsv(
              row.weeksOut !== null ? formatWeeksOutLabel(row.weeksOut) : "",
            );
          default:
            return "";
        }
      })(),
    ].join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `atleten-overzicht-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
