import { supabase } from "@/lib/supabaseClient";

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
  description: string | null;
  cues: string | null;
  video_url: string | null;
  video_path: string | null;
  thumbnail_url: string | null;
  active: boolean;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ExerciseLibraryItemInput = Omit<
  ExerciseLibraryItem,
  "id" | "created_at" | "updated_at"
> & { id?: string };

export async function loadExerciseLibraryItems(includeInactive = false) {
  let query = supabase
    .from("exercise_library_items")
    .select("*")
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

  return (data || []) as ExerciseLibraryItem[];
}

export async function saveExerciseLibraryItem(item: ExerciseLibraryItemInput) {
  const payload = {
    name: item.name.trim(),
    category: item.category.trim() || "Overig",
    description: item.description?.trim() || null,
    cues: item.cues?.trim() || null,
    video_url: item.video_url?.trim() || null,
    video_path: item.video_path?.trim() || null,
    thumbnail_url: item.thumbnail_url?.trim() || null,
    active: item.active,
    sort_order: item.sort_order,
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
