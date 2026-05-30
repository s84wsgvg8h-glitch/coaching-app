"use client";

import { Star, X } from "lucide-react";
import ChatAvatar from "@/components/chat/ChatAvatar";
import {
  countPollVotes,
  type PollMessagePayload,
  type PollVote,
} from "@/lib/chatPolls";

type MemberProfile = {
  name: string;
  avatar_url: string | null;
};

type PollDetailsPanelProps = {
  open: boolean;
  onClose: () => void;
  messageId: string;
  payload: PollMessagePayload;
  userId: string;
  votes: PollVote[];
  memberProfiles: Record<string, MemberProfile>;
  memberCount: number;
};

function formatVoteTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  return date.toLocaleString("nl-NL", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PollDetailsPanel({
  open,
  onClose,
  messageId,
  payload,
  userId,
  votes,
  memberProfiles,
  memberCount,
}: PollDetailsPanelProps) {
  if (!open) return null;

  const pollVotes = votes.filter((vote) => vote.poll_message_id === messageId);
  const totalVotes = pollVotes.length;
  const winningCount = Math.max(
    ...payload.options.map((option) =>
      countPollVotes(votes, messageId, option.id),
    ),
    0,
  );

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Sluit poll details"
        onClick={onClose}
        className="absolute inset-0 bg-black/35"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-gray-200 px-4 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-black">Poll details</h2>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              {payload.question}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {totalVotes} van {memberCount || totalVotes} leden stemden
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-6">
            {payload.options.map((option) => {
              const count = countPollVotes(votes, messageId, option.id);
              const optionVotes = pollVotes
                .filter((vote) => vote.option_id === option.id)
                .sort(
                  (a, b) =>
                    new Date(b.voted_at || 0).getTime() -
                    new Date(a.voted_at || 0).getTime(),
                );
              const isWinner = count > 0 && count === winningCount;

              return (
                <section key={option.id}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-black">
                      {option.text}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                        isWinner
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {count} stem{count === 1 ? "" : "men"}
                      {isWinner && <Star className="h-3.5 w-3.5 fill-current" />}
                    </span>
                  </div>

                  {optionVotes.length === 0 ? (
                    <p className="text-sm text-gray-500">Nog geen stemmen.</p>
                  ) : (
                    <ul className="space-y-3">
                      {optionVotes.map((vote) => {
                        const profile = memberProfiles[vote.user_id];
                        const displayName =
                          vote.user_id === userId
                            ? "Jij"
                            : profile?.name || "Onbekend";

                        return (
                          <li
                            key={`${vote.user_id}-${vote.voted_at}`}
                            className="flex items-center gap-3"
                          >
                            <ChatAvatar
                              name={profile?.name || displayName}
                              imageUrl={profile?.avatar_url}
                              className="h-11 w-11"
                              fallbackClassName="bg-gray-900 text-white"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-black">
                                {displayName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatVoteTime(vote.voted_at)}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
