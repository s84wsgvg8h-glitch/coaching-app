"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import VideoAnnotator from "@/components/video-review/VideoAnnotator";
import VideoReviewFeedbackComposer, {
  type FeedbackMediaItem,
} from "@/components/video-review/VideoReviewFeedbackComposer";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  loadExerciseLibraryItems,
  type ExerciseLibraryItem,
} from "@/lib/exerciseLibrary";

type VideoReview = {
  id: string;
  athlete_id: string;
  video_url: string;
  lift: string;
  exercise_name: string | null;
  set_number: number | null;
  caption: string | null;
  thumbnail_url: string | null;
  reference_video_url: string | null;
  reference_video_title: string | null;
  feedback_media: FeedbackMediaItem[] | null;
  status: "pending" | "reviewed";
  coach_feedback: string | null;
  created_at: string;
  athlete_name?: string;
};

type StatusFilter = "all" | "pending" | "reviewed";

function parseFeedbackMedia(value: unknown): FeedbackMediaItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is FeedbackMediaItem =>
      Boolean(
        item &&
          typeof item === "object" &&
          "url" in item &&
          typeof (item as FeedbackMediaItem).url === "string",
      ),
  );
}

function VideoReviewContent() {
  const searchParams = useSearchParams();
  const athleteFilter = searchParams.get("athlete");

  const [loading, setLoading] = useState(true);
  const [coachId, setCoachId] = useState("");
  const [reviews, setReviews] = useState<VideoReview[]>([]);
  const [libraryItems, setLibraryItems] = useState<ExerciseLibraryItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Video review";

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!isCoachLikeRole(profile?.role)) {
        window.location.href = "/dashboard";
        return;
      }

      setCoachId(user.id);

      const [{ data, error }, library] = await Promise.all([
        supabase
          .from("video_reviews")
          .select("*")
          .eq("coach_id", user.id)
          .order("created_at", { ascending: false }),
        loadExerciseLibraryItems(false),
      ]);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      const rows = (data || []) as VideoReview[];
      const athleteIds = [...new Set(rows.map((row) => row.athlete_id))];
      const { data: athletes } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in(
          "id",
          athleteIds.length > 0
            ? athleteIds
            : ["00000000-0000-0000-0000-000000000000"],
        );

      const nameMap = new Map(
        (athletes || []).map((athlete) => [
          athlete.id,
          athlete.full_name || "Atleet",
        ]),
      );

      setReviews(
        rows.map((row) => ({
          ...row,
          feedback_media: parseFeedbackMedia(row.feedback_media),
          athlete_name: nameMap.get(row.athlete_id),
        })),
      );
      setLibraryItems(library);
      setLoading(false);
    }

    void init();
  }, []);

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      if (athleteFilter && review.athlete_id !== athleteFilter) return false;
      if (statusFilter === "pending") return review.status === "pending";
      if (statusFilter === "reviewed") return review.status === "reviewed";
      return true;
    });
  }, [athleteFilter, reviews, statusFilter]);

  const pendingCount = reviews.filter(
    (review) =>
      review.status === "pending" &&
      (!athleteFilter || review.athlete_id === athleteFilter),
  ).length;

  async function saveFeedback(
    review: VideoReview,
    payload: {
      text: string;
      media: FeedbackMediaItem[];
      referenceVideoUrl: string | null;
      referenceVideoTitle: string | null;
    },
  ) {
    setSavingReviewId(review.id);

    const { error } = await supabase
      .from("video_reviews")
      .update({
        coach_feedback: payload.text,
        feedback_media: payload.media,
        reference_video_url: payload.referenceVideoUrl,
        reference_video_title: payload.referenceVideoTitle,
        status: "reviewed",
      })
      .eq("id", review.id);

    setSavingReviewId(null);

    if (error) {
      alert(error.message);
      return;
    }

    setReviews((current) =>
      current.map((row) =>
        row.id === review.id
          ? {
              ...row,
              coach_feedback: payload.text,
              feedback_media: payload.media,
              reference_video_url: payload.referenceVideoUrl,
              reference_video_title: payload.referenceVideoTitle,
              status: "reviewed" as const,
            }
          : row,
      ),
    );
    setEditingReviewId(null);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-app-muted">Video review</p>
            <h1 className="mt-1 text-3xl font-bold text-app-text">Video review</h1>
            <p className="mt-2 text-sm text-app-muted">
              {pendingCount > 0
                ? `${pendingCount} openstaande review${pendingCount === 1 ? "" : "s"}`
                : "Alle reviews zijn verwerkt."}
            </p>
          </div>
          {athleteFilter ? (
            <Link
              href={`/athletes/${athleteFilter}`}
              className="app-focus-ring inline-flex items-center gap-1 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm font-semibold text-app-muted transition hover:bg-app-surface-hover hover:text-app-text"
            >
              ← Atleet hub
            </Link>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: "Alles" },
              { id: "pending", label: "Niet beoordeeld" },
              { id: "reviewed", label: "Beoordeeld" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                statusFilter === item.id
                  ? "bg-brand-purple text-white"
                  : "bg-app-surface-muted text-app-text"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="app-card mt-6">
            <p className="text-sm text-app-muted">Laden...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="app-card mt-6">
            <p className="text-sm text-app-muted">Geen video reviews gevonden.</p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {filteredReviews.map((review) => {
              const isEditing =
                review.status === "pending" || editingReviewId === review.id;
              const media = review.feedback_media || [];

              return (
                <li key={review.id} className="app-card">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Link
                      href={`/athletes/${review.athlete_id}`}
                      className="font-semibold text-app-text hover:text-brand-purple"
                    >
                      {review.athlete_name}
                    </Link>
                    <span className="text-app-muted">·</span>
                    <span>{review.exercise_name || review.lift}</span>
                    {review.set_number ? (
                      <>
                        <span className="text-app-muted">·</span>
                        <span>Set {review.set_number}</span>
                      </>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        review.status === "pending"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {review.status === "pending" ? "Open" : "Beoordeeld"}
                    </span>
                  </div>

                  {review.caption ? (
                    <p className="mt-2 text-sm text-app-muted">{review.caption}</p>
                  ) : null}

                  {isEditing ? (
                    <VideoAnnotator videoUrl={review.video_url} className="mt-3" />
                  ) : (
                    <video
                      src={review.video_url}
                      controls
                      className="mt-3 max-h-64 w-full rounded-xl bg-black"
                    />
                  )}

                  {isEditing ? (
                    <VideoReviewFeedbackComposer
                      reviewId={review.id}
                      coachId={coachId}
                      initialText={review.coach_feedback || ""}
                      initialMedia={media}
                      libraryItems={libraryItems}
                      saving={savingReviewId === review.id}
                      onSave={(payload) => saveFeedback(review, payload)}
                    />
                  ) : (
                    <div className="mt-3 space-y-3">
                      {review.coach_feedback ? (
                        <p className="text-sm text-app-text whitespace-pre-wrap">
                          {review.coach_feedback}
                        </p>
                      ) : null}

                      {media.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {media.map((item, index) =>
                            item.type === "image" ? (
                              <img
                                key={`${item.url}-${index}`}
                                src={item.url}
                                alt={item.title || "Feedback"}
                                className="h-24 w-24 rounded-xl object-cover"
                              />
                            ) : (
                              <video
                                key={`${item.url}-${index}`}
                                src={item.url}
                                controls
                                className="h-24 w-32 rounded-xl bg-black object-cover"
                              />
                            ),
                          )}
                        </div>
                      ) : null}

                      {review.reference_video_url ? (
                        <div className="rounded-xl border border-app-border p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
                            Uitlegvideo
                          </p>
                          <p className="mt-1 text-sm font-semibold text-app-text">
                            {review.reference_video_title || "Uitlegvideo"}
                          </p>
                          <video
                            src={review.reference_video_url}
                            controls
                            className="mt-2 max-h-48 w-full rounded-xl bg-black"
                          />
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setEditingReviewId(review.id)}
                        className="app-btn-secondary text-sm"
                      >
                        Feedback aanpassen
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

export default function VideoReviewPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="app-card mt-6">
            <p className="text-sm text-app-muted">Video review laden...</p>
          </div>
        </AppShell>
      }
    >
      <VideoReviewContent />
    </Suspense>
  );
}
