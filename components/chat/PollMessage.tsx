"use client";

import {
  countPollVotes,
  getUserPollVote,
  type PollMessagePayload,
  type PollVote,
} from "@/lib/chatPolls";

type PollMessageProps = {
  messageId: string;
  payload: PollMessagePayload;
  userId: string;
  isMine: boolean;
  votes: PollVote[];
  memberCount: number;
  onVote: (optionId: string) => void;
  onOpenDetails: () => void;
  voting: boolean;
};

export default function PollMessage({
  messageId,
  payload,
  userId,
  isMine,
  votes,
  memberCount,
  onVote,
  onOpenDetails,
  voting,
}: PollMessageProps) {
  const userVote = getUserPollVote(votes, messageId, userId);
  const totalVotes = votes.filter((vote) => vote.poll_message_id === messageId)
    .length;

  return (
    <div className="space-y-3">
      <p className="text-[15px] font-bold leading-6">{payload.question}</p>

      <div className="space-y-2">
        {payload.options.map((option) => {
          const count = countPollVotes(votes, messageId, option.id);
          const percentage =
            totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const selected = userVote === option.id;

          return (
            <button
              key={option.id}
              type="button"
              disabled={voting}
              onClick={() => onVote(option.id)}
              className={`relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-60 ${
                selected
                  ? isMine
                    ? "border-white bg-white/15"
                    : "border-app-border bg-app-surface-muted"
                  : isMine
                    ? "border-white/30 hover:bg-white/10"
                    : "border-app-border hover:bg-app-surface-muted"
              }`}
            >
              {totalVotes > 0 && (
                <span
                  className={`absolute inset-y-0 left-0 ${
                    isMine ? "bg-white/20" : "bg-app-surface-hover"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <span className="relative flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{option.text}</span>
                <span
                  className={`text-xs font-bold ${
                    isMine ? "text-white/80" : "text-app-muted"
                  }`}
                >
                  {count}
                  {totalVotes > 0 ? ` (${percentage}%)` : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs ${isMine ? "text-white/70" : "text-app-muted"}`}>
          {totalVotes} stem{totalVotes === 1 ? "" : "men"}
          {memberCount > 0 ? ` · ${memberCount} leden` : ""}
        </p>

        {totalVotes > 0 && (
          <button
            type="button"
            onClick={onOpenDetails}
            className={`text-xs font-semibold underline-offset-2 hover:underline ${
              isMine ? "text-white/80" : "text-app-muted"
            }`}
          >
            Poll details
          </button>
        )}
      </div>
    </div>
  );
}
