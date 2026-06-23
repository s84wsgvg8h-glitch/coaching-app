import {
  setRowKey,
  upsertAthleteSetRow,
  type AthleteSetUpsertRow,
} from "@/lib/athleteSetPersistence";

const STORAGE_KEY = "offline-athlete-sets-v1";

export type QueuedAthleteSet = AthleteSetUpsertRow & {
  queuedAt: string;
};

function readQueue(): QueuedAthleteSet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedAthleteSet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(rows: QueuedAthleteSet[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function getOfflineSetQueue(): QueuedAthleteSet[] {
  return readQueue();
}

export function getOfflineSetQueueCount() {
  return readQueue().length;
}

export function enqueueOfflineSet(row: AthleteSetUpsertRow) {
  const key = setRowKey(row);
  const queue = readQueue().filter((item) => setRowKey(item) !== key);
  queue.push({ ...row, queuedAt: new Date().toISOString() });
  writeQueue(queue);
}

export function dequeueOfflineSet(row: AthleteSetUpsertRow) {
  const key = setRowKey(row);
  writeQueue(readQueue().filter((item) => setRowKey(item) !== key));
}

export async function flushOfflineSetQueue() {
  const queue = readQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const row of queue) {
    const { error } = await upsertAthleteSetRow(row);
    if (error) {
      failed += 1;
      continue;
    }
    dequeueOfflineSet(row);
    synced += 1;
  }

  return { synced, failed };
}

export async function persistAthleteSetRow(row: AthleteSetUpsertRow) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueueOfflineSet(row);
    return { error: null, queued: true as const };
  }

  const { error } = await upsertAthleteSetRow(row);
  if (error) {
    enqueueOfflineSet(row);
    return { error, queued: true as const };
  }

  dequeueOfflineSet(row);
  return { error: null, queued: false as const };
}
