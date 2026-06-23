import { supabase } from "@/lib/supabaseClient";
import { sendExerciseVideoMessageToCoach } from "@/lib/chatUtils";
import { submitVideoForReview } from "@/lib/videoReviews";

export type AthleteVideoSubmitTarget = "chat" | "video_review";

export function inferLiftFromExerciseName(exerciseName: string) {
  const name = exerciseName.toLowerCase();
  if (name.includes("squat")) return "squat";
  if (name.includes("bench")) return "bench";
  if (name.includes("deadlift")) return "deadlift";
  return "other";
}

export async function loadAthleteVideoSubmitTarget(
  athleteId: string,
): Promise<AthleteVideoSubmitTarget> {
  const { data, error } = await supabase
    .from("profiles")
    .select("video_submit_target")
    .eq("id", athleteId)
    .maybeSingle();

  if (error) return "chat";

  return data?.video_submit_target === "video_review" ? "video_review" : "chat";
}

export async function saveAthleteVideoSubmitTarget(
  athleteId: string,
  target: AthleteVideoSubmitTarget,
) {
  return supabase
    .from("profiles")
    .update({ video_submit_target: target })
    .eq("id", athleteId);
}

export async function routeAthleteExerciseVideo(params: {
  athleteId: string;
  coachId: string;
  target: AthleteVideoSubmitTarget;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  exerciseName: string;
  setNumber: number;
  reps: string | null;
  coachReps: string | null;
  weight: string | null;
  rpe: string | null;
  priority?: string | null;
}) {
  if (params.target === "video_review") {
    return submitVideoForReview({
      athleteId: params.athleteId,
      coachId: params.coachId,
      videoUrl: params.videoUrl,
      lift: inferLiftFromExerciseName(params.exerciseName),
      exerciseName: params.exerciseName,
      setNumber: params.setNumber,
      caption: params.caption,
      thumbnailUrl: params.thumbnailUrl,
    });
  }

  return sendExerciseVideoMessageToCoach({
    athleteId: params.athleteId,
    coachId: params.coachId,
    videoUrl: params.videoUrl,
    thumbnailUrl: params.thumbnailUrl,
    caption: params.caption,
    exerciseName: params.exerciseName,
    setNumber: params.setNumber,
    reps: params.reps,
    coachReps: params.coachReps,
    weight: params.weight,
    rpe: params.rpe,
    priority: params.priority ?? null,
  });
}
