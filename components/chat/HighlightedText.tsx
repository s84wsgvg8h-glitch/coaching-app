"use client";

import { splitHighlightedText } from "@/lib/chatSearch";

type HighlightedTextProps = {
  text: string;
  query: string;
  className?: string;
};

export default function HighlightedText({
  text,
  query,
  className = "",
}: HighlightedTextProps) {
  const parts = splitHighlightedText(text, query);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.highlight ? (
          <mark
            key={`${part.text}-${index}`}
            className="rounded bg-emerald-500/25 px-0.5 font-semibold text-emerald-200"
          >
            {part.text}
          </mark>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </span>
  );
}
