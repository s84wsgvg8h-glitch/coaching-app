import assert from "node:assert/strict";
import {
  buildProgramWeekDayDates,
  getWeekEndDateObject,
  getWeekStartDateObject,
} from "../lib/programWeek/dateFormatting";
import type { ProgramBlock, ProgramDay, ProgramWeek } from "../lib/programWeek/types";

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function testCrossWeekMondayAfterSunday() {
  const block: ProgramBlock = {
    id: "block-2",
    title: "Block 2",
    description: null,
    athlete_id: "athlete-1",
    start_date: "2026-06-22",
  };
  const week: ProgramWeek = {
    id: "week-1",
    title: "Week 1",
    week_number: 1,
    program_block_id: "block-2",
  };
  const days: ProgramDay[] = [
    {
      id: "day-thu",
      title: "Donderdag",
      day_number: 1,
      program_week_id: "week-1",
      notes: null,
      warmup: null,
    },
    {
      id: "day-fri",
      title: "Vrijdag",
      day_number: 2,
      program_week_id: "week-1",
      notes: null,
      warmup: null,
    },
    {
      id: "day-sat",
      title: "Zaterdag",
      day_number: 3,
      program_week_id: "week-1",
      notes: null,
      warmup: null,
    },
    {
      id: "day-sun",
      title: "Zondag",
      day_number: 4,
      program_week_id: "week-1",
      notes: null,
      warmup: null,
    },
    {
      id: "day-mon",
      title: "Maandag",
      day_number: 5,
      program_week_id: "week-1",
      notes: null,
      warmup: null,
      scheduled_date: "2026-06-22",
    },
  ];

  const dates = buildProgramWeekDayDates(block, week, days);

  assert.equal(formatIsoDate(dates.get("day-thu")!), "2026-06-25");
  assert.equal(formatIsoDate(dates.get("day-fri")!), "2026-06-26");
  assert.equal(formatIsoDate(dates.get("day-sat")!), "2026-06-27");
  assert.equal(formatIsoDate(dates.get("day-sun")!), "2026-06-28");
  assert.equal(formatIsoDate(dates.get("day-mon")!), "2026-06-29");
}

function testMondayAtStartUsesSameCalendarWeek() {
  const block: ProgramBlock = {
    id: "block-1",
    title: "Block 1",
    description: null,
    athlete_id: "athlete-1",
    start_date: "2026-06-22",
  };
  const week: ProgramWeek = {
    id: "week-1",
    title: "Week 1",
    week_number: 1,
    program_block_id: "block-1",
  };
  const days: ProgramDay[] = [
    {
      id: "day-mon",
      title: "Maandag",
      day_number: 1,
      program_week_id: "week-1",
      notes: null,
      warmup: null,
    },
    {
      id: "day-wed",
      title: "Woensdag",
      day_number: 2,
      program_week_id: "week-1",
      notes: null,
      warmup: null,
    },
  ];

  const dates = buildProgramWeekDayDates(block, week, days);

  assert.equal(formatIsoDate(dates.get("day-mon")!), "2026-06-22");
  assert.equal(formatIsoDate(dates.get("day-wed")!), "2026-06-24");
}

function testWeekTwoStartsSevenDaysAfterBlockStart() {
  const block: ProgramBlock = {
    id: "block-3",
    title: "Block 3",
    description: null,
    athlete_id: "athlete-1",
    start_date: "2026-06-25",
  };
  const week1: ProgramWeek = {
    id: "week-1",
    title: "Week 1",
    week_number: 1,
    program_block_id: "block-3",
  };
  const week2: ProgramWeek = {
    id: "week-2",
    title: "Week 2",
    week_number: 2,
    program_block_id: "block-3",
  };

  assert.equal(formatIsoDate(getWeekStartDateObject(block, week1, [week1])!), "2026-06-25");
  assert.equal(formatIsoDate(getWeekEndDateObject(block, week1, [week1])!), "2026-07-01");
  assert.equal(formatIsoDate(getWeekStartDateObject(block, week2, [week1, week2])!), "2026-07-02");
  assert.equal(formatIsoDate(getWeekEndDateObject(block, week2, [week1, week2])!), "2026-07-08");
}

function testWeekTwoDayNumbersContinueFromBlockStart() {
  const block: ProgramBlock = {
    id: "block-4",
    title: "Block 4",
    description: null,
    athlete_id: "athlete-1",
    start_date: "2026-06-25",
  };
  const week1: ProgramWeek = {
    id: "week-1",
    title: "Week 1",
    week_number: 1,
    program_block_id: "block-4",
  };
  const week2: ProgramWeek = {
    id: "week-2",
    title: "Week 2",
    week_number: 2,
    program_block_id: "block-4",
  };
  const days: ProgramDay[] = [
    {
      id: "day-1",
      title: "Dag 1",
      day_number: 1,
      program_week_id: "week-2",
      notes: null,
      warmup: null,
    },
    {
      id: "day-2",
      title: "Dag 2",
      day_number: 2,
      program_week_id: "week-2",
      notes: null,
      warmup: null,
    },
    {
      id: "day-3",
      title: "Dag 3",
      day_number: 3,
      program_week_id: "week-2",
      notes: null,
      warmup: null,
    },
  ];

  const dates = buildProgramWeekDayDates(block, week2, days, [week1, week2]);

  assert.equal(formatIsoDate(dates.get("day-1")!), "2026-07-02");
  assert.equal(formatIsoDate(dates.get("day-2")!), "2026-07-03");
  assert.equal(formatIsoDate(dates.get("day-3")!), "2026-07-04");
}

function testWeekTwoWeekdayTitlesStayInsideProgramWeek() {
  const block: ProgramBlock = {
    id: "block-5",
    title: "Block 5",
    description: null,
    athlete_id: "athlete-1",
    start_date: "2026-06-25",
  };
  const week1: ProgramWeek = {
    id: "week-1",
    title: "Week 1",
    week_number: 1,
    program_block_id: "block-5",
  };
  const week2: ProgramWeek = {
    id: "week-2",
    title: "Week 2",
    week_number: 2,
    program_block_id: "block-5",
  };
  const days: ProgramDay[] = [
    {
      id: "day-mon",
      title: "Maandag",
      day_number: 1,
      program_week_id: "week-2",
      notes: null,
      warmup: null,
      scheduled_date: "2026-06-22",
    },
    {
      id: "day-wed",
      title: "Woensdag",
      day_number: 2,
      program_week_id: "week-2",
      notes: null,
      warmup: null,
    },
    {
      id: "day-fri",
      title: "Vrijdag",
      day_number: 3,
      program_week_id: "week-2",
      notes: null,
      warmup: null,
    },
  ];

  const dates = buildProgramWeekDayDates(block, week2, days, [week1, week2]);

  assert.equal(formatIsoDate(dates.get("day-mon")!), "2026-07-06");
  assert.equal(formatIsoDate(dates.get("day-wed")!), "2026-07-08");
  assert.equal(formatIsoDate(dates.get("day-fri")!), "2026-07-10");
}

function testFirstWeekUsesBlockStartWhenWeekNumberHasGap() {
  const block: ProgramBlock = {
    id: "block-6",
    title: "Block 6",
    description: null,
    athlete_id: "athlete-1",
    start_date: "2026-08-03",
  };
  const week1StoredAsTwo: ProgramWeek = {
    id: "week-1",
    title: "Week 1",
    week_number: 2,
    program_block_id: "block-6",
  };
  const week2StoredAsThree: ProgramWeek = {
    id: "week-2",
    title: "Week 2",
    week_number: 3,
    program_block_id: "block-6",
  };
  const blockWeeks = [week1StoredAsTwo, week2StoredAsThree];
  const days: ProgramDay[] = [
    {
      id: "day-tue",
      title: "Dinsdag",
      day_number: 1,
      program_week_id: "week-1",
      notes: null,
      warmup: null,
    },
    {
      id: "day-wed",
      title: "Woensdag",
      day_number: 2,
      program_week_id: "week-1",
      notes: null,
      warmup: null,
    },
  ];

  const dates = buildProgramWeekDayDates(
    block,
    week1StoredAsTwo,
    days,
    blockWeeks,
  );

  assert.equal(formatIsoDate(getWeekStartDateObject(block, week1StoredAsTwo, blockWeeks)!), "2026-08-03");
  assert.equal(formatIsoDate(dates.get("day-tue")!), "2026-08-04");
  assert.equal(formatIsoDate(dates.get("day-wed")!), "2026-08-05");
  assert.equal(
    formatIsoDate(getWeekStartDateObject(block, week2StoredAsThree, blockWeeks)!),
    "2026-08-10",
  );
}

testCrossWeekMondayAfterSunday();
testMondayAtStartUsesSameCalendarWeek();
testWeekTwoStartsSevenDaysAfterBlockStart();
testWeekTwoDayNumbersContinueFromBlockStart();
testWeekTwoWeekdayTitlesStayInsideProgramWeek();
testFirstWeekUsesBlockStartWhenWeekNumberHasGap();

console.log("program-week-day-dates.test.ts passed");
