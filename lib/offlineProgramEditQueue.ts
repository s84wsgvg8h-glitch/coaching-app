import { idbGet, idbSet } from "@/lib/idbClient";
import { isOfflineEnvironment, isRetryableSyncError } from "@/lib/offlineNetwork";
import { supabase } from "@/lib/supabaseClient";

const STORAGE_KEY = "program-edit-queue-v1";
const MAX_SYNC_ATTEMPTS = 5;
const STALE_QUEUE_MS = 7 * 24 * 60 * 60 * 1000;

export type ProgramEditOperation =
  | {
      type: "table_update";
      table: "program_days" | "program_exercises" | "program_weeks" | "program_blocks";
      id: string;
      patch: Record<string, unknown>;
    }
  | {
      type: "table_insert";
      table: "program_days" | "program_exercises";
      row: Record<string, unknown>;
    }
  | {
      type: "table_delete";
      table: "program_days" | "program_exercises";
      id: string;
    }
  | {
      type: "batch_update";
      table: "program_exercises" | "program_days";
      updates: Array<{ id: string; patch: Record<string, unknown> }>;
    }
  | {
      type: "rpc";
      fn: string;
      args: Record<string, unknown>;
    };

export type QueuedProgramEdit = {
  id: string;
  blockId: string;
  weekId: string;
  queuedAt: string;
  attempts: number;
  op: ProgramEditOperation;
};

export type FlushProgramEditQueueResult = {
  synced: number;
  failed: number;
  dropped: number;
  affectedWeeks: Array<{ blockId: string; weekId: string }>;
};

function readQueue(): QueuedProgramEdit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedProgramEdit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(rows: QueuedProgramEdit[]) {
  if (typeof window === "undefined") return;
  if (rows.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function isStale(item: QueuedProgramEdit) {
  const queuedAt = Date.parse(item.queuedAt);
  if (!Number.isFinite(queuedAt)) return true;
  return Date.now() - queuedAt > STALE_QUEUE_MS;
}

function queueItemKey(item: QueuedProgramEdit) {
  const op = item.op;
  if (op.type === "table_update") {
    return `${op.type}:${op.table}:${op.id}:${JSON.stringify(op.patch)}`;
  }
  if (op.type === "table_insert") {
    return `${op.type}:${op.table}:${JSON.stringify(op.row)}`;
  }
  if (op.type === "table_delete") {
    return `${op.type}:${op.table}:${op.id}`;
  }
  if (op.type === "batch_update") {
    return `${op.type}:${op.table}:${JSON.stringify(op.updates)}`;
  }
  return `${op.type}:${op.fn}:${JSON.stringify(op.args)}`;
}

export function getProgramEditQueueCount() {
  return readQueue().length;
}

export function clearProgramEditQueue() {
  writeQueue([]);
}

export function enqueueProgramEdit(input: {
  blockId: string;
  weekId: string;
  op: ProgramEditOperation;
}) {
  const nextItem: QueuedProgramEdit = {
    id: crypto.randomUUID(),
    blockId: input.blockId,
    weekId: input.weekId,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    op: input.op,
  };
  const key = queueItemKey(nextItem);
  const withoutDuplicate = readQueue().filter((item) => queueItemKey(item) !== key);
  withoutDuplicate.push(nextItem);
  writeQueue(withoutDuplicate);
}

async function executeProgramEdit(op: ProgramEditOperation) {
  if (op.type === "table_update") {
    return supabase.from(op.table).update(op.patch).eq("id", op.id);
  }
  if (op.type === "table_insert") {
    return supabase.from(op.table).insert(op.row);
  }
  if (op.type === "table_delete") {
    return supabase.from(op.table).delete().eq("id", op.id);
  }
  if (op.type === "batch_update") {
    for (const update of op.updates) {
      const { error } = await supabase
        .from(op.table)
        .update(update.patch)
        .eq("id", update.id);
      if (error) return { error };
    }
    return { error: null };
  }
  return supabase.rpc(op.fn, op.args);
}

function bumpAttempt(item: QueuedProgramEdit) {
  writeQueue(
    readQueue().map((row) =>
      row.id === item.id ? { ...row, attempts: (row.attempts || 0) + 1 } : row,
    ),
  );
}

function dequeueItem(item: QueuedProgramEdit) {
  writeQueue(readQueue().filter((row) => row.id !== item.id));
}

export async function executeProgramEditOrQueue(input: {
  blockId: string;
  weekId: string;
  op: ProgramEditOperation;
}) {
  if (isOfflineEnvironment()) {
    enqueueProgramEdit(input);
    return { error: null, queued: true as const };
  }

  const { error } = await executeProgramEdit(input.op);

  if (!error) {
    return { error: null, queued: false as const };
  }

  if (isRetryableSyncError(error)) {
    enqueueProgramEdit(input);
    return { error, queued: true as const };
  }

  return { error, queued: false as const };
}

export async function flushProgramEditQueue(): Promise<FlushProgramEditQueueResult> {
  const queue = readQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0, dropped: 0, affectedWeeks: [] };
  }

  if (isOfflineEnvironment()) {
    return {
      synced: 0,
      failed: queue.length,
      dropped: 0,
      affectedWeeks: [],
    };
  }

  let synced = 0;
  let failed = 0;
  let dropped = 0;
  const affectedWeeks = new Map<string, { blockId: string; weekId: string }>();

  for (const item of queue) {
    if (isStale(item)) {
      dequeueItem(item);
      dropped += 1;
      continue;
    }

    const { error } = await executeProgramEdit(item.op);

    if (!error) {
      dequeueItem(item);
      synced += 1;
      affectedWeeks.set(`${item.blockId}:${item.weekId}`, {
        blockId: item.blockId,
        weekId: item.weekId,
      });
      continue;
    }

    if (!isRetryableSyncError(error)) {
      dequeueItem(item);
      dropped += 1;
      continue;
    }

    bumpAttempt(item);
    const attempts = (item.attempts || 0) + 1;
    if (attempts >= MAX_SYNC_ATTEMPTS) {
      dequeueItem(item);
      dropped += 1;
      continue;
    }

    failed += 1;
  }

  return {
    synced,
    failed,
    dropped,
    affectedWeeks: [...affectedWeeks.values()],
  };
}

export const PROGRAM_OFFLINE_SYNC_COMPLETE_EVENT = "program-offline-sync-complete";

export function dispatchProgramOfflineSyncComplete(
  affectedWeeks: Array<{ blockId: string; weekId: string }>,
) {
  if (typeof window === "undefined" || affectedWeeks.length === 0) return;
  window.dispatchEvent(
    new CustomEvent(PROGRAM_OFFLINE_SYNC_COMPLETE_EVENT, {
      detail: affectedWeeks,
    }),
  );
}

// Mirror queue in IDB for durability across localStorage clears (best-effort).
export async function mirrorProgramEditQueueToIdb() {
  await idbSet("programEditQueue", STORAGE_KEY, readQueue());
}

export async function restoreProgramEditQueueFromIdb() {
  const stored = await idbGet<QueuedProgramEdit[]>("programEditQueue", STORAGE_KEY);
  if (stored?.length) {
    writeQueue(stored);
  }
}
