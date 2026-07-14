"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag, X } from "lucide-react";
import {
  CHAT_REPORT_REASONS,
  submitChatReport,
  type ChatReportReasonId,
} from "@/lib/chatReports";

export type ChatReportTarget = {
  title: string;
  reportedUserId?: string | null;
  messageId?: string | null;
  groupId?: string | null;
};

type ChatReportSheetProps = {
  open: boolean;
  target: ChatReportTarget | null;
  onClose: () => void;
  onSubmitted?: () => void;
};

function ChatReportForm({
  target,
  onClose,
  onSubmitted,
}: {
  target: ChatReportTarget;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [reason, setReason] = useState<ChatReportReasonId>("inappropriate");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    const { error: submitError } = await submitChatReport({
      reportedUserId: target.reportedUserId,
      messageId: target.messageId,
      groupId: target.groupId,
      reason,
      details,
    });

    if (submitError) {
      setError(submitError.message);
      setSubmitting(false);
      return;
    }

    onSubmitted?.();
    onClose();
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-app-text">Reden</legend>
        {CHAT_REPORT_REASONS.map((option) => (
          <label
            key={option.id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-app-border px-3 py-2"
          >
            <input
              type="radio"
              name="chat-report-reason"
              value={option.id}
              checked={reason === option.id}
              onChange={() => setReason(option.id)}
              className="h-4 w-4 accent-app-accent"
            />
            <span className="text-sm text-app-text">{option.label}</span>
          </label>
        ))}
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-app-text">
          Toelichting (optioneel)
        </span>
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Beschrijf kort wat er mis is…"
          className="w-full resize-none rounded-xl border border-app-border bg-app-surface px-3 py-2 text-base text-app-text outline-none focus:border-app-accent md:text-sm"
        />
      </label>

      <p className="text-xs leading-relaxed text-app-muted">
        Meldingen worden binnen 24 uur beoordeeld. Zie ons{" "}
        <Link href="/voorwaarden#ugc" className="font-semibold text-app-text underline">
          communitybeleid
        </Link>
        .
      </p>

      {error ? (
        <p className="text-xs font-medium text-red-600 dark:text-red-300">{error}</p>
      ) : null}

      <button
        type="button"
        disabled={submitting}
        onClick={() => void handleSubmit()}
        className="app-focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
        {submitting ? "Versturen…" : "Melding versturen"}
      </button>
    </div>
  );
}

export default function ChatReportSheet({
  open,
  target,
  onClose,
  onSubmitted,
}: ChatReportSheetProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !target) return null;

  const formKey = `${target.messageId ?? ""}:${target.reportedUserId ?? ""}:${target.groupId ?? ""}`;

  return (
    <div className="fixed inset-0 z-[95]">
      <button
        type="button"
        aria-label="Melding sluiten"
        className="absolute inset-0 bg-app-overlay"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-report-title"
        className="chat-sheet absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto pb-[max(16px,env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-app-border md:bg-app-surface md:shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-app-border px-4 py-3">
          <div className="min-w-0">
            <p id="chat-report-title" className="text-sm font-bold text-app-text">
              Content melden
            </p>
            <p className="mt-0.5 truncate text-xs text-app-muted">{target.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-btn app-focus-ring shrink-0"
            aria-label="Sluiten"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ChatReportForm
          key={formKey}
          target={target}
          onClose={onClose}
          onSubmitted={onSubmitted}
        />
      </div>
    </div>
  );
}
