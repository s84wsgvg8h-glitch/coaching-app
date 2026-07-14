import { NextRequest, NextResponse } from "next/server";
import { assertCoachLike } from "@/lib/coachApiAuth";
import {
  exerciseLibraryCategorySchema,
  parseJsonBody,
} from "@/lib/apiValidation";
import { nextExerciseLibraryCategorySortOrder } from "@/lib/exerciseLibrary";

export async function GET(request: NextRequest) {
  const access = await assertCoachLike(request);
  if (!access.db) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  const { data, error } = await access.db
    .from("exercise_library_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ categories: data || [] });
}

export async function POST(request: NextRequest) {
  const access = await assertCoachLike(request);
  if (!access.db) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  const parsed = await parseJsonBody(request, exerciseLibraryCategorySchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const name = parsed.data.name.trim();
  const parentId = parsed.data.parentId || null;

  let existingQuery = access.db
    .from("exercise_library_categories")
    .select("*")
    .eq("name", name);

  existingQuery =
    parentId === null
      ? existingQuery.is("parent_id", null)
      : existingQuery.eq("parent_id", parentId);

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    return NextResponse.json({ category: existing });
  }

  const { data, error } = await access.db
    .from("exercise_library_categories")
    .insert({
      name,
      parent_id: parentId,
      sort_order: nextExerciseLibraryCategorySortOrder(),
    })
    .select("*")
    .single();

  if (error?.code === "23505") {
    const { data: duplicate } = await existingQuery.maybeSingle();
    if (duplicate) {
      return NextResponse.json({ category: duplicate });
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ category: data });
}

export async function DELETE(request: NextRequest) {
  const access = await assertCoachLike(request);
  if (!access.db) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is verplicht." }, { status: 400 });
  }

  async function deleteRecursive(categoryId: string) {
    const { data: children } = await access.db!
      .from("exercise_library_categories")
      .select("id")
      .eq("parent_id", categoryId);

    for (const child of children || []) {
      await deleteRecursive(child.id as string);
    }

    await access.db!.from("exercise_library_categories").delete().eq("id", categoryId);
  }

  try {
    await deleteRecursive(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verwijderen mislukt." },
      { status: 400 },
    );
  }
}
