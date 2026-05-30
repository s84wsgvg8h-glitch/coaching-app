"use client";

import {
  groupReactionsByEmoji,
  type MessageReaction,
} from "@/lib/chatReactions";

type ChatMessageReactionsProps = {
  reactions: MessageReaction[];
  currentUserId: string;
  onToggle: (emoji: string) => void;
};

export default function ChatMessageReactions({
  reactions,
  currentUserId,
  onToggle,
}: ChatMessageReactionsProps) {
  if (reactions.length === 0) return null;

  const grouped = groupReactionsByEmoji(reactions);

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {grouped.map(({ emoji, users }) => {
        const mine = users.some((user) => user.user_id === currentUserId);
        const title = users
          .map((user) => user.user_name || "Gebruiker")
          .join(", ");

        return (
          <button
            key={emoji}
            type="button"
            title={title}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(emoji);
            }}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition ${
              mine
                ? "border-brand-purple/40 bg-brand-purple/10"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <span>{emoji}</span>
            <span className="font-semibold text-gray-600">{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}
