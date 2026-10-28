import assert from "node:assert/strict";
import {
  buildProgramSidebarCompetitionEntries,
  getProgramLastBlockEndDate,
  getWeeksBetweenBlockEndAndMeet,
} from "../lib/programWeek/competitionSidebar";
import type { ProgramBlock, ProgramWeek } from "../lib/programWeek/types";

function testLastBlockEndAndGapWeeks() {
  const blocks: ProgramBlock[] = [
    {
      id: "block-1",
      title: "Block 1",
      description: null,
      athlete_id: "athlete-1",
      start_date: "2026-07-28",
    },
    {
      id: "block-3",
      title: "Block 3",
      description: null,
      athlete_id: "athlete-1",
      start_date: "2026-08-25",
    },
  ];

  const weeksByBlock: Record<string, ProgramWeek[]> = {
    "block-1": [
      {
        id: "w1",
        title: "Week 1",
        week_number: 1,
        program_block_id: "block-1",
      },
      {
        id: "w2",
        title: "Week 2",
        week_number: 2,
        program_block_id: "block-1",
      },
    ],
    "block-3": [
      {
        id: "w3",
        title: "Week 1",
        week_number: 1,
        program_block_id: "block-3",
      },
      {
        id: "w4",
        title: "Week 2",
        week_number: 2,
        program_block_id: "block-3",
      },
    ],
  };

  const lastEnd = getProgramLastBlockEndDate(blocks, weeksByBlock);
  assert.ok(lastEnd);

  const lastEndIso = `${lastEnd.getFullYear()}-${String(lastEnd.getMonth() + 1).padStart(2, "0")}-${String(lastEnd.getDate()).padStart(2, "0")}`;
  assert.equal(lastEndIso, "2026-09-07");

  assert.equal(
    getWeeksBetweenBlockEndAndMeet(lastEnd, "2026-09-14"),
    1,
  );
  assert.equal(
    getWeeksBetweenBlockEndAndMeet(lastEnd, "2026-09-21"),
    2,
  );
}

function testBuildSidebarEntries() {
  const blocks: ProgramBlock[] = [
    {
      id: "block-1",
      title: "Block 1",
      description: null,
      athlete_id: "athlete-1",
      start_date: "2026-08-25",
    },
  ];
  const weeksByBlock: Record<string, ProgramWeek[]> = {
    "block-1": [
      {
        id: "w1",
        title: "Week 1",
        week_number: 1,
        program_block_id: "block-1",
      },
    ],
  };

  const entries = buildProgramSidebarCompetitionEntries(blocks, weeksByBlock, [
    {
      id: "meet-1",
      naam: "Nationals",
      start_date: "2026-09-14",
      end_date: "2026-09-14",
    },
  ]);

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.name, "Nationals");
  assert.equal(entries[0]?.weeksAfterLastBlock, 2);
}

testLastBlockEndAndGapWeeks();
testBuildSidebarEntries();

console.log("program-competition-sidebar.test.ts passed");
