import { getTodayDateString } from "@/lib/competitions";

export type MeetWeekSummary = {
  competitionId: string;
  name: string;
  weeksOut: number;
  daysOut: number;
};

export function daysUntilMeet(dateStr: string) {
  const today = new Date(getTodayDateString());
  const target = new Date(`${dateStr}T12:00:00`);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function weeksOutFromMeet(dateStr: string) {
  const days = daysUntilMeet(dateStr);
  if (days <= 0) return 0;
  return Math.ceil(days / 7);
}

export function formatWeeksOutLabel(weeksOut: number) {
  if (weeksOut <= 0) return "Wedstrijdweek";
  if (weeksOut === 1) return "1 week uit";
  return `${weeksOut} weken uit`;
}

export function buildMeetWeekSummaries(
  meets: Array<{ id: string; naam: string; start_date: string }>,
): MeetWeekSummary[] {
  return meets
    .map((meet) => {
      const daysOut = daysUntilMeet(meet.start_date);
      if (daysOut < 0) return null;
      return {
        competitionId: meet.id,
        name: meet.naam,
        weeksOut: weeksOutFromMeet(meet.start_date),
        daysOut,
      };
    })
    .filter((row): row is MeetWeekSummary => Boolean(row))
    .sort((a, b) => a.daysOut - b.daysOut);
}

export const MEET_PREP_MILESTONES = [
  {
    weeksOut: 4,
    title: "4 weken uit",
    description: "Begin met competition standard trainen.",
  },
  {
    weeksOut: 2,
    title: "2 weken uit",
    description:
      "Let op gewicht, bekijk de meet-checklist en streef naar perfecte SBD-uitvoering.",
  },
  {
    weeksOut: 1,
    title: "1 week uit",
    description: "Cut plannen, tas inpakken en laatste details regelen.",
  },
] as const;

export function getActiveMeetMilestone(weeksOut: number) {
  if (weeksOut <= 0) {
    return {
      title: "Wedstrijdweek",
      description: "Focus op rust, timing en uitvoering op het platform.",
    };
  }

  const sorted = [...MEET_PREP_MILESTONES].sort(
    (a, b) => a.weeksOut - b.weeksOut,
  );

  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    if (weeksOut <= sorted[index].weeksOut) {
      return sorted[index];
    }
  }

  return {
    title: `${weeksOut} weken uit`,
    description:
      "Bouw verder richting peaking. Houd techniek scherp en plan wedstrijdprep op tijd.",
  };
}

export function getUpcomingMeetMilestones(weeksOut: number) {
  return MEET_PREP_MILESTONES.filter((item) => weeksOut >= item.weeksOut);
}
