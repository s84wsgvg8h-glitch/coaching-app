import { supabase } from "@/lib/supabaseClient";
import { getAuthSessionToken } from "@/lib/coachApiAuth";

async function categoryApi<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const token = await getAuthSessionToken();
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });

    const json = (await response.json()) as { error?: string } & T;

    if (!response.ok) {
      return {
        data: null,
        error: new Error(json.error || "Verzoek mislukt."),
      };
    }

    return { data: json as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Verzoek mislukt."),
    };
  }
}

export const EXERCISE_LIBRARY_CATEGORIES = [
  "Squat",
  "Bench press",
  "Deadlift",
  "Accessoire",
  "Mobility",
  "Overig",
] as const;

export type ExerciseLibraryCategory =
  (typeof EXERCISE_LIBRARY_CATEGORIES)[number];

export type ExerciseLibraryItem = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  cues: string | null;
  video_url: string | null;
  video_path: string | null;
  thumbnail_url: string | null;
  active: boolean;
  sort_order: number;
  storage_provider?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  storage_content_type?: string | null;
  storage_size_bytes?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ExerciseLibraryItemInput = Omit<
  ExerciseLibraryItem,
  "id" | "created_at" | "updated_at"
> & { id?: string };

export type ExerciseLibraryCategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

export function nextExerciseLibraryCategorySortOrder() {
  return Math.floor(Date.now() / 1000);
}

const HIDDEN_BUILTIN_CATEGORIES_KEY = "exercise-library-hidden-v1";

export function loadHiddenExerciseLibraryCategories(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(HIDDEN_BUILTIN_CATEGORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hideExerciseLibraryCategory(name: string) {
  if (typeof window === "undefined") return;

  const current = new Set(loadHiddenExerciseLibraryCategories());
  current.add(name);
  window.localStorage.setItem(
    HIDDEN_BUILTIN_CATEGORIES_KEY,
    JSON.stringify([...current]),
  );
}

export async function loadExerciseLibraryCategories() {
  const apiResult = await categoryApi<{ categories: ExerciseLibraryCategoryRow[] }>(
    "/api/exercise-library/categories",
  );

  if (!apiResult.error && apiResult.data?.categories) {
    return apiResult.data.categories;
  }

  const { data, error } = await supabase
    .from("exercise_library_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Oefeningcategorieën laden mislukt:", error.message);
    return [] as ExerciseLibraryCategoryRow[];
  }

  return (data || []) as ExerciseLibraryCategoryRow[];
}

export async function saveExerciseLibraryCategory(
  name: string,
  parentId: string | null = null,
) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { data: null, error: new Error("Vul een categorienaam in.") };
  }

  const apiResult = await categoryApi<{ category: ExerciseLibraryCategoryRow }>(
    "/api/exercise-library/categories",
    {
      method: "POST",
      body: JSON.stringify({ name: trimmed, parentId }),
    },
  );

  if (!apiResult.error && apiResult.data?.category) {
    return { data: apiResult.data.category, error: null };
  }

  if (apiResult.error) {
    return { data: null, error: apiResult.error };
  }

  return supabase
    .from("exercise_library_categories")
    .insert({
      name: trimmed,
      parent_id: parentId,
      sort_order: nextExerciseLibraryCategorySortOrder(),
    })
    .select("*")
    .single();
}

export async function loadExerciseLibraryItems(includeInactive = false) {
  let query = supabase
    .from("exercise_library_items")
    .select(
      "id, name, category, subcategory, description, cues, video_url, thumbnail_url, active, sort_order, created_at, updated_at",
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Oefeningenbibliotheek laden mislukt:", error.message);
    return [] as ExerciseLibraryItem[];
  }

  return (data || []).map((row) => ({
    ...(row as ExerciseLibraryItem),
    video_path: null,
  })) as ExerciseLibraryItem[];
}

export async function loadExerciseLibraryItemById(id: string) {
  const { data, error } = await supabase
    .from("exercise_library_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as ExerciseLibraryItem;
}

export async function saveExerciseLibraryItem(item: ExerciseLibraryItemInput) {
  const payload = {
    name: item.name.trim(),
    category: item.category.trim() || "Overig",
    subcategory: item.subcategory?.trim() || null,
    description: item.description?.trim() || null,
    cues: item.cues?.trim() || null,
    video_url: item.video_url?.trim() || null,
    video_path: item.video_path?.trim() || null,
    thumbnail_url: item.thumbnail_url?.trim() || null,
    active: item.active,
    sort_order: item.sort_order,
    storage_provider: item.storage_provider || "supabase",
    storage_bucket: item.storage_bucket || null,
    storage_path: item.storage_path || null,
    storage_content_type: item.storage_content_type || null,
    storage_size_bytes: item.storage_size_bytes ?? null,
    updated_at: new Date().toISOString(),
  };

  if (item.id) {
    return supabase
      .from("exercise_library_items")
      .update(payload)
      .eq("id", item.id);
  }

  return supabase.from("exercise_library_items").insert(payload);
}

export async function deleteExerciseLibraryItem(id: string) {
  return supabase.from("exercise_library_items").delete().eq("id", id);
}

export async function deleteExerciseLibraryCategory(id: string) {
  const apiResult = await categoryApi<{ ok: boolean }>(
    `/api/exercise-library/categories?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );

  if (!apiResult.error) {
    return { data: null, error: null };
  }

  const { data: children } = await supabase
    .from("exercise_library_categories")
    .select("id")
    .eq("parent_id", id);

  for (const child of children || []) {
    await deleteExerciseLibraryCategory(child.id as string);
  }

  return supabase.from("exercise_library_categories").delete().eq("id", id);
}
