import {
  setRowKey,
  upsertAthleteSetRow,
  type AthleteSetUpsertRow,
} from "@/lib/athleteSetPersistence";
import { isOfflineEnvironment, isRetryableSyncError } from "@/lib/offlineNetwork";

const STORAGE_KEY = "offline-athlete-sets-v1";
const MAX_SYNC_ATTEMPTS = 5;
const STALE_QUEUE_MS = 7 * 24 * 60 * 60 * 1000;

export type QueuedAthleteSet = AthleteSetUpsertRow & {
  queuedAt: string;
  attempts?: number;
};

export type FlushOfflineSetQueueResult = {
  synced: number;
  failed: number;
  dropped: number;
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
  if (rows.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function isStaleQueueItem(item: QueuedAthleteSet) {
  const queuedAt = Date.parse(item.queuedAt);
  if (!Number.isFinite(queuedAt)) return true;
  return Date.now() - queuedAt > STALE_QUEUE_MS;
}

export function getOfflineSetQueue(): QueuedAthleteSet[] {
  return readQueue();
}

export function getOfflineSetQueueCount() {
  return readQueue().length;
}

export function clearOfflineSetQueue() {
  writeQueue([]);
}

export function enqueueOfflineSet(row: AthleteSetUpsertRow) {
  const key = setRowKey(row);
  const existing = readQueue().find((item) => setRowKey(item) === key);
  const queue = readQueue().filter((item) => setRowKey(item) !== key);
  queue.push({
    ...row,
    queuedAt: existing?.queuedAt || new Date().toISOString(),
    attempts: existing?.attempts || 0,
  });
  writeQueue(queue);
}

export function dequeueOfflineSet(row: AthleteSetUpsertRow) {
  const key = setRowKey(row);
  writeQueue(readQueue().filter((item) => setRowKey(item) !== key));
}

function bumpQueueAttempt(row: QueuedAthleteSet) {
  const key = setRowKey(row);
  writeQueue(
    readQueue().map((item) =>
      setRowKey(item) === key
        ? { ...item, attempts: (item.attempts || 0) + 1 }
        : item,
    ),
  );
}

export async function flushOfflineSetQueue(): Promise<FlushOfflineSetQueueResult> {
  const queue = readQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0, dropped: 0 };
  }

  if (isOfflineEnvironment()) {
    return { synced: 0, failed: queue.length, dropped: 0 };
  }

  let synced = 0;
  let failed = 0;
  let dropped = 0;

  for (const row of queue) {
    if (isStaleQueueItem(row)) {
      dequeueOfflineSet(row);
      dropped += 1;
      continue;
    }

    const { error } = await upsertAthleteSetRow(row);

    if (!error) {
      dequeueOfflineSet(row);
      synced += 1;
      continue;
    }

    if (!isRetryableSyncError(error)) {
      dequeueOfflineSet(row);
      dropped += 1;
      continue;
    }

    bumpQueueAttempt(row);
    const attempts = (row.attempts || 0) + 1;

    if (attempts >= MAX_SYNC_ATTEMPTS) {
      dequeueOfflineSet(row);
      dropped += 1;
      continue;
    }

    failed += 1;
  }

  return { synced, failed, dropped };
}

export async function persistAthleteSetRow(row: AthleteSetUpsertRow) {
  if (isOfflineEnvironment()) {
    enqueueOfflineSet(row);
    return { error: null, queued: true as const };
  }

  const { error } = await upsertAthleteSetRow(row);

  if (error) {
    if (isRetryableSyncError(error)) {
      enqueueOfflineSet(row);
      return { error, queued: true as const };
    }

    return { error, queued: false as const };
  }

  dequeueOfflineSet(row);
  return { error: null, queued: false as const };
}
