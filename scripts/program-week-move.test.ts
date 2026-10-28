import assert from "node:assert/strict";
import {
  buildWeeksByBlockAfterMove,
  computeChainedBlockStartDates,
  resolveWeekDropIndex,
} from "../lib/programWeekMove";
import type { ProgramBlock, ProgramWeek } from "../lib/programWeek/types";

const block1: ProgramBlock = {
  id: "block-1",
  title: "Block 1",
  description: null,
  athlete_id: "athlete-1",
  start_date: "2026-07-06",
};

const block2: ProgramBlock = {
  id: "block-2",
  title: "Block 2",
  description: null,
  athlete_id: "athlete-1",
  start_date: "2026-08-03",
};

const weeksByBlock: Record<string, ProgramWeek[]> = {
  "block-1": [
    {
      id: "week-1",
      title: "Week 1",
      week_number: 1,
      program_block_id: "block-1",
    },
    {
      id: "week-4",
      title: "Week 4",
      week_number: 4,
      program_block_id: "block-1",
    },
  ],
  "block-2": [
    {
      id: "week-2",
      title: "Week 1",
      week_number: 1,
      program_block_id: "block-2",
    },
  ],
};

function testMoveWeekBetweenBlocks() {
  const next = buildWeeksByBlockAfterMove({
    weekId: "week-4",
    sourceBlockId: "block-1",
    targetBlockId: "block-2",
    targetWeekIndex: 1,
    navBlocks: [block1, block2],
    weeksByBlock,
  });

  assert.equal(next?.["block-1"].length, 1);
  assert.equal(next?.["block-1"][0]?.id, "week-1");
  assert.equal(next?.["block-2"].length, 2);
  assert.equal(next?.["block-2"][0]?.id, "week-2");
  assert.equal(next?.["block-2"][1]?.id, "week-4");
  assert.equal(next?.["block-2"][1]?.week_number, 2);
}

function testChainedBlockStartDates() {
  const nextWeeks = buildWeeksByBlockAfterMove({
    weekId: "week-4",
    sourceBlockId: "block-1",
    targetBlockId: "block-2",
    targetWeekIndex: 1,
    navBlocks: [block1, block2],
    weeksByBlock,
  });

  assert.ok(nextWeeks);

  const updates = computeChainedBlockStartDates([block1, block2], nextWeeks);
  assert.equal(updates.get("block-2"), "2026-07-13");
}

function testResolveWeekDropIndex() {
  const weeks = weeksByBlock["block-2"];
  assert.equal(
    resolveWeekDropIndex(weeks, {
      blockId: "block-2",
      targetWeekId: "week-2",
      position: "after",
    }),
    1,
  );
}

testMoveWeekBetweenBlocks();
testChainedBlockStartDates();
testResolveWeekDropIndex();

console.log("program-week-move.test.ts passed");
