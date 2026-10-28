import assert from "node:assert/strict";
import {
  pickClosestProgramDayEntry,
  type ProgramBlockRow,
  type ProgramWeekRow,
} from "../lib/programNavigation";

function makeBlock(startDate: string): ProgramBlockRow {
  return {
    id: "block-1",
    title: "Block 1",
    athlete_id: "athlete-1",
    start_date: startDate,
  };
}

function makeWeek(id: string, weekNumber: number): ProgramWeekRow {
  return {
    id,
    title: `Week ${weekNumber}`,
    week_number: weekNumber,
    program_block_id: "block-1",
  };
}

function testOpensNextWeekWhenCurrentWeekIsPast() {
  const block = makeBlock("2026-07-07");
  const weeks = [makeWeek("week-1", 1), makeWeek("week-2", 2)];
  const daysByWeekId = {
    "week-1": [
      { id: "day-mon-w1", day_number: 1, scheduled_date: "2026-07-07", title: "Dag 1" },
      { id: "day-wed-w1", day_number: 2, scheduled_date: "2026-07-09", title: "Dag 2" },
      { id: "day-fri-w1", day_number: 3, scheduled_date: "2026-07-11", title: "Dag 3" },
    ],
    "week-2": [
      { id: "day-mon-w2", day_number: 1, scheduled_date: "2026-07-14", title: "Dag 1" },
    ],
  };

  const entry = pickClosestProgramDayEntry(
    block,
    weeks,
    daysByWeekId,
    new Date("2026-07-13T12:00:00"),
  );

  assert.equal(entry?.weekId, "week-2");
  assert.equal(entry?.dayId, "day-mon-w2");
}

function testPicksTodayWhenAvailable() {
  const block = makeBlock("2026-07-06");
  const weeks = [makeWeek("week-1", 1)];
  const daysByWeekId = {
    "week-1": [
      { id: "day-mon", day_number: 1, scheduled_date: "2026-07-07", title: "Dag 1" },
      { id: "day-wed", day_number: 2, scheduled_date: "2026-07-09", title: "Dag 2" },
      { id: "day-fri", day_number: 3, scheduled_date: "2026-07-11", title: "Dag 3" },
    ],
  };

  const entry = pickClosestProgramDayEntry(
    block,
    weeks,
    daysByWeekId,
    new Date("2026-07-09T12:00:00"),
  );

  assert.equal(entry?.dayId, "day-wed");
}

function testLooksAcrossAllWeeksInBlock() {
  const block = makeBlock("2026-06-02");
  const weeks = [makeWeek("week-1", 1), makeWeek("week-2", 2), makeWeek("week-3", 3)];
  const daysByWeekId = {
    "week-1": [
      { id: "w1d1", day_number: 1, scheduled_date: "2026-06-03", title: "Dag 1" },
    ],
    "week-2": [
      { id: "w2d1", day_number: 1, scheduled_date: "2026-06-10", title: "Dag 1" },
    ],
    "week-3": [
      { id: "w3d1", day_number: 1, scheduled_date: "2026-06-17", title: "Dag 1" },
      { id: "w3d2", day_number: 2, scheduled_date: "2026-06-19", title: "Dag 2" },
    ],
  };

  const entry = pickClosestProgramDayEntry(
    block,
    weeks,
    daysByWeekId,
    new Date("2026-06-18T12:00:00"),
  );

  assert.equal(entry?.weekId, "week-3");
  assert.equal(entry?.dayId, "w3d2");
}

testOpensNextWeekWhenCurrentWeekIsPast();
testPicksTodayWhenAvailable();
testLooksAcrossAllWeeksInBlock();

console.log("program-navigation-closest-day tests passed");
