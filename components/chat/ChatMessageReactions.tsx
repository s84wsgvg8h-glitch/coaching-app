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
            className={`chat-reaction-pill ${mine ? "chat-reaction-pill-active" : ""}`}
          >
            <span>{emoji}</span>
            <span className="font-semibold text-app-muted">{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}
