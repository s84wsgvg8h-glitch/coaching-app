import { formatBwNumber, loadAthleteDailyBwData } from "@/lib/chatBwData";
import {
  filterIntensitySnapshotByDateRange,
  formatLiftLabel,
  loadAthleteSbdIntensityData,
  type IntensitySnapshot,
} from "@/lib/chatIntensityData";
import {
  formatRepMaxLabel,
  formatRepMaxWeight,
  loadAthleteSbdPrData,
} from "@/lib/chatPrData";
import {
  filterVolumeRowsByDateRange,
  formatTonnage,
  loadAthleteSbdVolumeData,
  sumLiftVolume,
  type SbdLift,
  type WeeklyVolumeRow,
} from "@/lib/chatVolumeData";
import type { CoachSnapshot } from "@/lib/knowledgeSearch";

const SBD_LIFTS: SbdLift[] = ["squat", "bench", "deadlift"];

const DATA_KEYWORDS =
  /\b(volume|tonnage|intensiteit|intensity|progressie|progress|trend|analyse|analyze|data|raw|sets?|reps?|1rm|pr|max|bench|squat|deadlift|sbd|bw|bodyweight|lichaamsgewicht|gewicht|stagn|stijg|dal|weken?|week)\b/i;

export type TrainingAthleteRef = {
  id: string;
  name: string;
};

export type TrainingSnapshot = {
  athlete: TrainingAthleteRef;
  periodLabel: string;
  startDate: string;
  endDate: string;
  weekCount: number;
  prSummary: string;
  volumeSummary: string;
  intensitySummary: string;
  bwSummary: string;
  trendSummary: string;
  warnings: string[];
};

export function isTrainingDataQuestion(query: string) {
  return DATA_KEYWORDS.test(query);
}

export function isAdminDataQuestion(query: string) {
  return /\b(inkomsten|betaling|betaaldag|betaald|prijs|pending|omzet|lidnummer|atleetadministratie)\b/i.test(
    query,
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function athleteIdFromHref(href: string) {
  const match = href.match(/\/profile\/([^/?#]+)/);
  return match?.[1] || null;
}

export function listCoachAthletes(snapshot?: CoachSnapshot): TrainingAthleteRef[] {
  return (snapshot?.athletes || [])
    .map((athlete) => {
      const id = athleteIdFromHref(athlete.href);
      if (!id) return null;
      return { id, name: athlete.name };
    })
    .filter((athlete): athlete is TrainingAthleteRef => athlete !== null);
}

export function resolveAthleteFromQuery(
  query: string,
  snapshot?: CoachSnapshot,
  selfAthlete?: TrainingAthleteRef,
): TrainingAthleteRef | null {
  const athletes = listCoachAthletes(snapshot);
  const normalizedQuery = normalizeText(query);

  for (const athlete of athletes) {
    const normalizedName = normalizeText(athlete.name);
    const firstName = normalizedName.split(/\s+/)[0];

    if (
      normalizedQuery.includes(normalizedName) ||
      (firstName.length > 2 && normalizedQuery.includes(firstName))
    ) {
      return athlete;
    }
  }

  if (athletes.length === 1) {
    return athletes[0];
  }

  if (selfAthlete) {
    const selfName = normalizeText(selfAthlete.name);
    const firstName = selfName.split(/\s+/)[0];
    if (
      normalizedQuery.includes(selfName) ||
      (firstName.length > 2 && normalizedQuery.includes(firstName)) ||
      athletes.length === 0
    ) {
      return selfAthlete;
    }
  }

  if (!athletes.length && selfAthlete) {
    return selfAthlete;
  }

  return null;
}

function resolveRecentWeekCount(query: string, defaultWeeks = 8) {
  const match = query.match(/laatste\s+(\d+)\s+we(e)?k(en)?/i);
  if (match) {
    return Math.min(Math.max(parseInt(match[1], 10), 1), 52);
  }

  if (/afgelopen\s+maand|vorige\s+maand|last\s+month/i.test(query)) {
    return 4;
  }

  if (/afgelopen\s+2\s+weken|two\s+weeks/i.test(query)) {
    return 2;
  }

  return defaultWeeks;
}

function pickRecentWeeks(rows: WeeklyVolumeRow[], weekCount: number) {
  if (rows.length <= weekCount) return rows;
  return rows.slice(-weekCount);
}

function pctChangeLabel(current: number, previous: number) {
  if (previous <= 0 && current <= 0) return "geen data";
  if (previous <= 0) return "nieuw volume";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

function formatLiftVolumeLine(lift: SbdLift, volume: ReturnType<typeof sumLiftVolume>) {
  return `${formatLiftLabel(lift)}: ${volume.sets}s / ${volume.reps}r / ${formatTonnage(volume.tonnage)}`;
}

function buildPrSummary(prData: Awaited<ReturnType<typeof loadAthleteSbdPrData>>) {
  const lines = SBD_LIFTS.flatMap((lift) => {
    const liftData = prData.find((entry) => entry.lift === lift);
    const oneRm = liftData?.repMaxes.find((entry) => entry.reps === 1);
    const bestTriple = liftData?.repMaxes.find((entry) => entry.reps === 3);

    if (!oneRm && !bestTriple) return [];

    const parts = [
      oneRm ? `${formatRepMaxLabel(1)} ${formatRepMaxWeight(oneRm.weight)}` : null,
      bestTriple ? `3RM ${formatRepMaxWeight(bestTriple.weight)}` : null,
    ].filter(Boolean);

    return [`- ${formatLiftLabel(lift)}: ${parts.join(", ")}`];
  });

  return lines.length ? lines.join("\n") : "Geen SBD PR-data gevonden.";
}

function buildVolumeSummary(rows: WeeklyVolumeRow[]) {
  if (!rows.length) return "Geen volume-data in geselecteerde periode.";

  const weekLines = rows.map((row) => {
    const lifts = SBD_LIFTS.map((lift) => {
      const volume = row[lift];
      if (volume.sets === 0 && volume.reps === 0 && volume.tonnage === 0) {
        return `${formatLiftLabel(lift)} —`;
      }
      return `${formatLiftLabel(lift)} ${volume.sets}s/${volume.reps}r/${formatTonnage(volume.tonnage)}`;
    });

    return `- ${row.blockTitle} · ${row.weekTitle} (${row.date}): ${lifts.join(" | ")}`;
  });

  const totals = SBD_LIFTS.map((lift) => formatLiftVolumeLine(lift, sumLiftVolume(rows, lift)));
  return `${weekLines.join("\n")}\nTotaal periode: ${totals.join(" · ")}`;
}

function buildIntensitySummary(snapshot: IntensitySnapshot) {
  const lines = SBD_LIFTS.map((lift) => {
    const stats = snapshot.stats[lift];
    if (
      stats.averageIntensity === null &&
      stats.peakIntensity === null &&
      stats.peakLoad === null
    ) {
      return `- ${formatLiftLabel(lift)}: geen intensiteitsdata`;
    }

    return `- ${formatLiftLabel(lift)}: gem ${stats.averageIntensity ?? "-"}%1RM, piek ${stats.peakIntensity ?? "-"}%1RM, peak load ${stats.peakLoad ?? "-"} kg`;
  });

  const recentPeaks = snapshot.peakLoadRows.slice(-4);
  const peakLines =
    recentPeaks.length > 0
      ? recentPeaks
          .map((row) => {
            const lifts = SBD_LIFTS.map((lift) => {
              const value = row[lift];
              return value ? `${formatLiftLabel(lift)} ${value}kg` : null;
            }).filter(Boolean);
            return `- ${row.weekTitle} (${row.date}): ${lifts.join(" · ") || "—"}`;
          })
          .join("\n")
      : "";

  return `${lines.join("\n")}${peakLines ? `\nWeekly peak loads:\n${peakLines}` : ""}`;
}

function buildBwSummary(points: Awaited<ReturnType<typeof loadAthleteDailyBwData>>) {
  if (!points.length) return "Geen BW-check-ins in geselecteerde periode.";

  const values = points.map((point) => point.value);
  const start = values[0];
  const end = values[values.length - 1];
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const delta = end - start;

  return `- ${points.length} metingen (${points[0].date} t/m ${points[points.length - 1].date})\n- Start ${formatBwNumber(start)} kg → eind ${formatBwNumber(end)} kg (${delta >= 0 ? "+" : ""}${formatBwNumber(delta)} kg)\n- Gemiddelde ${formatBwNumber(avg)} kg`;
}

function buildTrendSummary(allRows: WeeklyVolumeRow[], periodRows: WeeklyVolumeRow[]) {
  if (periodRows.length < 2) {
    return "Te weinig weken voor trendvergelijking.";
  }

  const split = Math.max(1, Math.floor(periodRows.length / 2));
  const recent = periodRows.slice(-split);
  const previous = periodRows.slice(-split * 2, -split);

  if (!previous.length) {
    return "Geen vorige periode om tegen te vergelijken.";
  }

  return SBD_LIFTS.map((lift) => {
    const recentTonnage = sumLiftVolume(recent, lift).tonnage;
    const previousTonnage = sumLiftVolume(previous, lift).tonnage;
    return `- ${formatLiftLabel(lift)} tonnage (${recent.length} vs ${previous.length} weken): ${pctChangeLabel(recentTonnage, previousTonnage)}`;
  }).join("\n");
}

export async function buildTrainingSnapshot(
  athlete: TrainingAthleteRef,
  query: string,
): Promise<TrainingSnapshot> {
  const warnings: string[] = [];
  const weekCount = resolveRecentWeekCount(query);

  const [volumeRows, intensitySnapshot, bwPoints, prData] = await Promise.all([
    loadAthleteSbdVolumeData(athlete.id),
    loadAthleteSbdIntensityData(athlete.id),
    loadAthleteDailyBwData(athlete.id),
    loadAthleteSbdPrData(athlete.id),
  ]);

  if (!volumeRows.length && !intensitySnapshot.setRecords.length && !bwPoints.length) {
    warnings.push("Geen ingevulde trainingsdata gevonden voor deze atleet.");
  }

  const recentVolumeWeeks = pickRecentWeeks(volumeRows, weekCount);
  const startDate = recentVolumeWeeks[0]?.date || volumeRows[0]?.date || "";
  const endDate =
    recentVolumeWeeks[recentVolumeWeeks.length - 1]?.date ||
    volumeRows[volumeRows.length - 1]?.date ||
    "";

  const filteredVolume = startDate && endDate
    ? filterVolumeRowsByDateRange(volumeRows, startDate, endDate)
    : recentVolumeWeeks;

  const filteredIntensity =
    startDate && endDate
      ? filterIntensitySnapshotByDateRange(intensitySnapshot, startDate, endDate)
      : intensitySnapshot;

  const filteredBw =
    startDate && endDate
      ? bwPoints.filter((point) => point.date >= startDate && point.date <= endDate)
      : bwPoints.slice(-Math.min(bwPoints.length, weekCount * 7));

  const periodLabel =
    startDate && endDate
      ? `Laatste ${filteredVolume.length || weekCount} week/weken met data (${startDate} t/m ${endDate})`
      : `Laatste ${weekCount} weken (geen datums beschikbaar)`;

  return {
    athlete,
    periodLabel,
    startDate,
    endDate,
    weekCount: filteredVolume.length || weekCount,
    prSummary: buildPrSummary(prData),
    volumeSummary: buildVolumeSummary(filteredVolume.length ? filteredVolume : recentVolumeWeeks),
    intensitySummary: buildIntensitySummary(filteredIntensity),
    bwSummary: buildBwSummary(filteredBw),
    trendSummary: buildTrendSummary(
      volumeRows,
      filteredVolume.length ? filteredVolume : recentVolumeWeeks,
    ),
    warnings,
  };
}

export function formatTrainingSnapshotForPrompt(snapshot?: TrainingSnapshot) {
  if (!snapshot) {
    return "Geen trainingsdata meegestuurd.";
  }

  const warningBlock =
    snapshot.warnings.length > 0
      ? `Let op:\n${snapshot.warnings.map((warning) => `- ${warning}`).join("\n")}\n\n`
      : "";

  return `${warningBlock}Atleet: ${snapshot.athlete.name}
Periode: ${snapshot.periodLabel}

PR's / rep maxes:
${snapshot.prSummary}

Volume (SBD):
${snapshot.volumeSummary}

Intensiteit:
${snapshot.intensitySummary}

Bodyweight:
${snapshot.bwSummary}

Trend (recent vs vorige helft van periode):
${snapshot.trendSummary}`;
}

export function formatMissingAthletePrompt(snapshot?: CoachSnapshot) {
  const athletes = listCoachAthletes(snapshot);
  if (!athletes.length) {
    return "Geen atleten beschikbaar om data-analyse op te doen.";
  }

  return `Geen atleet herkend in de vraag. Beschikbare atleten: ${athletes.map((athlete) => athlete.name).join(", ")}. Vraag opnieuw met een atleetnaam.`;
}
