"use client";

import { Check, CheckCheck } from "lucide-react";

type ChatBubbleMetaProps = {
  time: string;
  isMine: boolean;
  isRead?: boolean;
  showReadReceipt?: boolean;
  overlay?: boolean;
};

export default function ChatBubbleMeta({
  time,
  isMine,
  isRead = false,
  showReadReceipt = false,
  overlay = false,
}: ChatBubbleMetaProps) {
  return (
    <span
      className={[
        "chat-bubble-meta",
        isMine ? "chat-bubble-meta--own" : "chat-bubble-meta--other",
        overlay ? "chat-bubble-meta--overlay" : "chat-bubble-meta--inline",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="chat-message-time">{time}</span>
      {isMine && showReadReceipt ? (
        isRead ? (
          <CheckCheck className="chat-bubble-meta-check" strokeWidth={2.25} aria-hidden="true" />
        ) : (
          <Check className="chat-bubble-meta-check" strokeWidth={2.25} aria-hidden="true" />
        )
      ) : null}
    </span>
  );
}
