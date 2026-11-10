import { loadCoachProgramAthletes } from "@/lib/coachProgramAthletes";
import { isOfflineEnvironment } from "@/lib/offlineNetwork";
import {
  cacheAthleteProgramsOffline,
} from "@/lib/programWeekCoreClient";

const DEFAULT_CONCURRENCY = 2;

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  if (items.length === 0) return;

  const limit = Math.max(1, concurrency);
  let index = 0;

  async function runNext() {
    while (index < items.length) {
      const current = index;
      index += 1;
      await worker(items[current]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runNext()),
  );
}

/** Cache all blocks/weeks for one athlete into IndexedDB. */
export async function prefetchAthleteProgramsForOffline(
  athleteId: string,
  options?: { userId?: string; role?: string },
) {
  if (!athleteId || isOfflineEnvironment()) return;
  await cacheAthleteProgramsOffline(athleteId, options);
}

/**
 * Cache programs for every coach athlete in the background.
 * Runs with low concurrency so the UI stays responsive.
 */
export async function prefetchAllCoachProgramsForOffline(
  coachId: string,
  options?: {
    userId?: string;
    role?: string;
    concurrency?: number;
    prioritizeAthleteIds?: string[];
  },
) {
  if (!coachId || isOfflineEnvironment()) return;

  const athletes = await loadCoachProgramAthletes(coachId);
  if (athletes.length === 0) return;

  const prioritized = new Set(options?.prioritizeAthleteIds || []);
  const ordered = [
    ...athletes.filter((athlete) => prioritized.has(athlete.id)),
    ...athletes.filter((athlete) => !prioritized.has(athlete.id)),
  ];

  await mapWithConcurrency(
    ordered,
    options?.concurrency ?? DEFAULT_CONCURRENCY,
    async (athlete) => {
      try {
        await cacheAthleteProgramsOffline(athlete.id, {
          userId: options?.userId || coachId,
          role: options?.role,
        });
      } catch {
        // Continue with remaining athletes.
      }
    },
  );
}
