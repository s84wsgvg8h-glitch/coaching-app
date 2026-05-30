import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import { getSbdLiftName } from "@/lib/exercisePriority";

const DEFAULT_SCORE_THRESHOLD = 15;

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
}

function tokenize(name: string) {
  return normalizeName(name).split(" ").filter(Boolean);
}

export function inferExerciseLibraryCategory(
  exerciseName: string,
): string | null {
  return getSbdLiftName(exerciseName);
}

export function scoreExerciseLibrarySuggestion(
  exerciseName: string,
  item: ExerciseLibraryItem,
  exerciseCategory?: string | null,
) {
  const normalizedExercise = normalizeName(exerciseName);
  const normalizedItem = normalizeName(item.name);

  if (!normalizedExercise) return 0;

  let score = 0;

  if (normalizedExercise === normalizedItem) {
    score += 100;
  }

  if (
    normalizedItem.includes(normalizedExercise) ||
    normalizedExercise.includes(normalizedItem)
  ) {
    score += 40;
  }

  const exerciseWords = tokenize(exerciseName);
  const itemWords = tokenize(item.name);

  for (const word of exerciseWords) {
    if (word.length < 3) continue;

    for (const itemWord of itemWords) {
      if (itemWord === word) {
        score += 20;
      } else if (itemWord.includes(word) || word.includes(itemWord)) {
        score += 10;
      }
    }
  }

  const category =
    exerciseCategory?.trim() || inferExerciseLibraryCategory(exerciseName);

  if (category && item.category === category) {
    score += 25;
  }

  return score;
}

export function getExerciseLibrarySuggestions(
  exerciseName: string,
  items: ExerciseLibraryItem[],
  options?: {
    exerciseCategory?: string | null;
    threshold?: number;
    limit?: number;
  },
) {
  const cleanName = exerciseName.trim();
  if (!cleanName) return [] as ExerciseLibraryItem[];

  const threshold = options?.threshold ?? DEFAULT_SCORE_THRESHOLD;
  const limit = options?.limit ?? 5;

  return items
    .map((item) => ({
      item,
      score: scoreExerciseLibrarySuggestion(
        cleanName,
        item,
        options?.exerciseCategory,
      ),
    }))
    .filter((entry) => entry.score >= threshold)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
