"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import { supabase } from "@/lib/supabaseClient";

export type FeedbackMediaItem = {
  type: "image" | "video" | "uitleg";
  url: string;
  title?: string | null;
};

type VideoReviewFeedbackComposerProps = {
  reviewId: string;
  coachId: string;
  initialText?: string;
  initialMedia?: FeedbackMediaItem[];
  libraryItems: ExerciseLibraryItem[];
  saving?: boolean;
  onSave: (payload: {
    text: string;
    media: FeedbackMediaItem[];
    referenceVideoUrl: string | null;
    referenceVideoTitle: string | null;
  }) => Promise<void>;
};

export default function VideoReviewFeedbackComposer({
  reviewId,
  coachId,
  initialText = "",
  initialMedia = [],
  libraryItems,
  saving = false,
  onSave,
}: VideoReviewFeedbackComposerProps) {
  const [text, setText] = useState(initialText);
  const [media, setMedia] = useState<FeedbackMediaItem[]>(initialMedia);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const videoCaptureRef = useRef<HTMLInputElement>(null);
  const photoCaptureRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(initialText);
    setMedia(initialMedia);
  }, [initialText, initialMedia, reviewId]);

  const uitlegQuery = useMemo(() => {
    const match = text.match(/(?:^|\s)\/uitleg(?:\s+(.+))?$/i);
    if (!match) return null;
    return (match[1] || "").trim().toLowerCase();
  }, [text]);

  const uitlegSuggestions = useMemo(() => {
    if (uitlegQuery === null) return [];
    return libraryItems
      .filter((item) =>
        uitlegQuery
          ? item.name.toLowerCase().includes(uitlegQuery)
          : true,
      )
      .slice(0, 8);
  }, [libraryItems, uitlegQuery]);

  async function uploadFeedbackFile(file: File) {
    setUploading(true);
    try {
      const extension = file.name.split(".").pop() || "bin";
      const path = `${coachId}/review-feedback/${reviewId}/${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from("exercise-videos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data } = supabase.storage.from("exercise-videos").getPublicUrl(path);
      const type = file.type.startsWith("video/") ? "video" : "image";

      setMedia((current) => [
        ...current,
        { type, url: data.publicUrl, title: file.name },
      ]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload mislukt");
    } finally {
      setUploading(false);
      setMenuOpen(false);
    }
  }

  function addUitlegVideo(item: ExerciseLibraryItem) {
    const videoUrl = item.video_url;
    if (!videoUrl) return;
    setMedia((current) => [
      ...current.filter((entry) => entry.type !== "uitleg"),
      { type: "uitleg" as const, url: videoUrl, title: item.name },
    ]);
    setText((current) => current.replace(/(?:^|\s)\/uitleg(?:\s+.*)?$/i, "").trim());
  }

  function removeMedia(index: number) {
    setMedia((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSave() {
    const uitleg = media.find((item) => item.type === "uitleg");
    await onSave({
      text: text.trim(),
      media,
      referenceVideoUrl: uitleg?.url || null,
      referenceVideoTitle: uitleg?.title || null,
    });
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="relative flex items-end gap-2">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted"
            aria-label="Media toevoegen"
          >
            <Plus className="h-5 w-5" />
          </button>

          {menuOpen ? (
            <div className="absolute bottom-full left-0 z-20 mb-2 w-52 rounded-xl border border-app-border bg-app-surface p-1 shadow-lg">
              <button
                type="button"
                onClick={() => videoCaptureRef.current?.click()}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-surface-muted"
              >
                Video maken
              </button>
              <button
                type="button"
                onClick={() => photoCaptureRef.current?.click()}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-surface-muted"
              >
                Foto maken
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-surface-muted"
              >
                Camera roll
              </button>
              <button
                type="button"
                onClick={() => {
                  setText((current) =>
                    current.trim() ? `${current.trim()} /uitleg ` : "/uitleg ",
                  );
                  setMenuOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-surface-muted"
              >
                /uitleg
              </button>
            </div>
          ) : null}
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Typ feedback... gebruik /uitleg voor uitlegvideo's"
          rows={3}
          className="min-w-0 flex-1 rounded-xl border border-app-border px-3 py-2 text-sm app-focus-ring"
        />
      </div>

      {uitlegSuggestions.length > 0 ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-2">
          <p className="px-2 text-xs font-bold uppercase tracking-wide text-violet-800">
            Uitlegvideo&apos;s
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {uitlegSuggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addUitlegVideo(item)}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-900 hover:bg-violet-100"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {media.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {media.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              className="relative overflow-hidden rounded-xl border border-app-border bg-black"
            >
              <button
                type="button"
                onClick={() => removeMedia(index)}
                className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
              >
                <X className="h-3 w-3" />
              </button>
              {item.type === "image" ? (
                <img
                  src={item.url}
                  alt={item.title || "Feedback foto"}
                  className="h-24 w-24 object-cover"
                />
              ) : (
                <video
                  src={item.url}
                  className="h-24 w-32 object-cover"
                  controls
                />
              )}
              {item.title ? (
                <p className="max-w-[8rem] truncate bg-white px-2 py-1 text-[10px] font-semibold">
                  {item.title}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={saving || uploading}
        onClick={() => void handleSave()}
        className="app-btn-primary disabled:opacity-50"
      >
        {saving ? "Opslaan..." : "Feedback opslaan"}
      </button>

      <input
        ref={videoCaptureRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFeedbackFile(file);
          event.target.value = "";
        }}
      />
      <input
        ref={photoCaptureRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFeedbackFile(file);
          event.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFeedbackFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
