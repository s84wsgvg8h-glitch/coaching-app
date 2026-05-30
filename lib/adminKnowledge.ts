import type { KnowledgeChunk } from "@/lib/knowledgeBase";
import { supabase } from "@/lib/supabaseClient";

export type AdminKnowledgeChunkRow = {
  id: string;
  scope: "coach" | "athlete";
  chunk_key: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
  active: boolean;
  updated_at: string;
  updated_by: string | null;
};

export function adminRowToKnowledgeChunk(row: AdminKnowledgeChunkRow): KnowledgeChunk {
  return {
    id: row.chunk_key,
    title: row.title,
    category: row.category,
    content: row.content,
    keywords: row.keywords || [],
  };
}

export async function loadActiveAdminKnowledgeChunks(
  scope: "coach" | "athlete",
): Promise<KnowledgeChunk[]> {
  const { data, error } = await supabase
    .from("admin_knowledge_chunks")
    .select("*")
    .eq("scope", scope)
    .eq("active", true);

  if (error) {
    console.error("Admin kennis laden mislukt:", error.message);
    return [];
  }

  return ((data || []) as AdminKnowledgeChunkRow[]).map(adminRowToKnowledgeChunk);
}

export async function loadAllAdminKnowledgeChunks(): Promise<AdminKnowledgeChunkRow[]> {
  const { data, error } = await supabase
    .from("admin_knowledge_chunks")
    .select("*")
    .order("scope")
    .order("category")
    .order("title");

  if (error) {
    console.error("Admin kennis laden mislukt:", error.message);
    return [];
  }

  return (data || []) as AdminKnowledgeChunkRow[];
}

export async function createAdminKnowledgeChunk(
  row: Omit<AdminKnowledgeChunkRow, "id" | "updated_at" | "updated_by">,
  updatedBy: string,
) {
  return supabase.from("admin_knowledge_chunks").insert({
    scope: row.scope,
    chunk_key: row.chunk_key,
    title: row.title,
    category: row.category,
    content: row.content,
    keywords: row.keywords,
    active: row.active,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });
}

export async function updateAdminKnowledgeChunk(
  id: string,
  patch: Partial<
    Pick<
      AdminKnowledgeChunkRow,
      "scope" | "chunk_key" | "title" | "category" | "content" | "keywords" | "active"
    >
  >,
  updatedBy: string,
) {
  return supabase
    .from("admin_knowledge_chunks")
    .update({
      ...patch,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function deleteAdminKnowledgeChunk(id: string) {
  return supabase.from("admin_knowledge_chunks").delete().eq("id", id);
}
