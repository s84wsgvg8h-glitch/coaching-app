import { supabase } from "@/lib/supabaseClient";

export async function submitVideoForReview(input: {
  athleteId: string;
  coachId: string;
  videoUrl: string;
  lift: string;
  exerciseName?: string | null;
  setNumber?: number | null;
  caption?: string | null;
  thumbnailUrl?: string | null;
}) {
  return supabase.from("video_reviews").insert({
    athlete_id: input.athleteId,
    coach_id: input.coachId,
    video_url: input.videoUrl,
    lift: input.lift,
    exercise_name: input.exerciseName ?? null,
    set_number: input.setNumber ?? null,
    caption: input.caption ?? null,
    thumbnail_url: input.thumbnailUrl ?? null,
    status: "pending",
  });
}

export async function saveVideoReviewReference(input: {
  reviewId: string;
  referenceVideoUrl: string | null;
  referenceVideoTitle: string | null;
}) {
  return supabase
    .from("video_reviews")
    .update({
      reference_video_url: input.referenceVideoUrl,
      reference_video_title: input.referenceVideoTitle,
    })
    .eq("id", input.reviewId);
}
