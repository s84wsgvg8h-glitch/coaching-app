import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/adminApiAuth";

export async function GET(request: Request) {
  try {
    const access = await assertAdmin(request);
    if (!access.admin) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { data, error } = await access.admin
      .from("admin_knowledge_chunks")
      .select("*")
      .order("scope")
      .order("category")
      .order("title");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ chunks: data || [] });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Kennis laden mislukt.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await assertAdmin(request);
    if (!access.admin || !access.userId) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = (await request.json()) as {
      scope?: "coach" | "athlete";
      chunk_key?: string;
      title?: string;
      category?: string;
      content?: string;
      keywords?: string[];
      active?: boolean;
    };

    if (!body.scope || !body.chunk_key || !body.title || !body.category) {
      return NextResponse.json(
        { error: "scope, chunk_key, title en category zijn verplicht." },
        { status: 400 },
      );
    }

    const { data, error } = await access.admin
      .from("admin_knowledge_chunks")
      .insert({
        scope: body.scope,
        chunk_key: body.chunk_key.trim(),
        title: body.title.trim(),
        category: body.category.trim(),
        content: body.content?.trim() || "",
        keywords: body.keywords || [],
        active: body.active ?? true,
        updated_by: access.userId,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ chunk: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Kennis aanmaken mislukt.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await assertAdmin(request);
    if (!access.admin || !access.userId) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = (await request.json()) as {
      id?: string;
      scope?: "coach" | "athlete";
      chunk_key?: string;
      title?: string;
      category?: string;
      content?: string;
      keywords?: string[];
      active?: boolean;
    };

    if (!body.id) {
      return NextResponse.json({ error: "id is verplicht." }, { status: 400 });
    }

    const { id, ...patch } = body;
    const { data, error } = await access.admin
      .from("admin_knowledge_chunks")
      .update({
        ...patch,
        updated_by: access.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ chunk: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Kennis bijwerken mislukt.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await assertAdmin(request);
    if (!access.admin) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json({ error: "id is verplicht." }, { status: 400 });
    }

    const { error } = await access.admin
      .from("admin_knowledge_chunks")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Kennis verwijderen mislukt.",
      },
      { status: 500 },
    );
  }
}
