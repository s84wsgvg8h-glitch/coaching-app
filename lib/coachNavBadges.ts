import { isAdminRole } from "@/lib/authRoles";
import { loadCoachTodosFast } from "@/lib/coachTodos";
import { getUnopenedConversationCount } from "@/lib/chatUnread";
import { countCoachTodosDueToday } from "@/lib/todoDueToday";
import { supabase } from "@/lib/supabaseClient";

export type CoachNavBadges = {
  chat: number;
  todo: number;
  videoReview: number;
  pendingAthletes: number;
};

export async function loadCoachNavBadges(
  userId: string,
  role: string,
): Promise<CoachNavBadges> {
  const [chat, todosResult, pendingResult, videoResult] = await Promise.all([
    getUnopenedConversationCount(userId),
    loadCoachTodosFast(userId),
    isAdminRole(role)
      ? supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "pending")
      : supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "pending")
          .eq("coach_id", userId),
    supabase
      .from("video_reviews")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", userId)
      .eq("status", "pending"),
  ]);

  return {
    chat,
    todo: countCoachTodosDueToday(todosResult.data || []),
    videoReview: videoResult.count || 0,
    pendingAthletes: pendingResult.count || 0,
  };
}
