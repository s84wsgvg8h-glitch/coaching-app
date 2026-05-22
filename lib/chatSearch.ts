import { supabase } from "@/lib/supabaseClient";
import type { ChatMessage } from "@/lib/chatUtils";
import { parseExerciseVideoMessage } from "@/lib/chatUtils";

export type GlobalMessageSearchResult = {
  message: ChatMessage;
  chatKind: "direct" | "group";
  chatId: string;
  chatTitle: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getSearchableMessageText(message: ChatMessage) {
  if (parseExerciseVideoMessage(message.body)) {
    return message.body ? "Video" : "Video";
  }

  if (message.body) return message.body;
  if (message.file_type === "image") return "Foto";
  if (message.file_type === "video") return "Video";
  if (message.file_type === "audio") return "Spraakbericht";
  return "";
}

export function messageMatchesQuery(message: ChatMessage, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return getSearchableMessageText(message).toLowerCase().includes(normalized);
}

export function splitHighlightedText(text: string, query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [{ text, highlight: false }];
  }

  const parts = text.split(new RegExp(`(${escapeRegex(normalizedQuery)})`, "gi"));

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlight: part.toLowerCase() === normalizedQuery.toLowerCase(),
    }));
}

export async function searchMessagesGlobally(
  userId: string,
  query: string,
  contacts: Array<{ id: string; full_name: string }>,
  groups: Array<{ id: string; name: string }>,
) {
  const normalized = query.trim();
  if (normalized.length < 1) return [] as GlobalMessageSearchResult[];

  const pattern = `%${normalized}%`;

  const directResults = await Promise.all(
    contacts.map(async (contact) => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .is("group_id", null)
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${userId})`,
        )
        .ilike("body", pattern)
        .order("created_at", { ascending: false })
        .limit(5);

      return (data || []).map((message) => ({
        message: message as ChatMessage,
        chatKind: "direct" as const,
        chatId: contact.id,
        chatTitle: contact.full_name,
      }));
    }),
  );

  const groupResults = await Promise.all(
    groups.map(async (group) => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("group_id", group.id)
        .ilike("body", pattern)
        .order("created_at", { ascending: false })
        .limit(5);

      return (data || []).map((message) => ({
        message: message as ChatMessage,
        chatKind: "group" as const,
        chatId: group.id,
        chatTitle: group.name,
      }));
    }),
  );

  return [...directResults.flat(), ...groupResults.flat()].sort(
    (a, b) =>
      new Date(b.message.created_at).getTime() -
      new Date(a.message.created_at).getTime(),
  );
}
