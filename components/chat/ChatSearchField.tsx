"use client";

import SearchInput, { type SearchInputProps } from "@/components/ui/SearchInput";

type ChatSearchFieldProps = Omit<SearchInputProps, "variant" | "tone"> & {
  /** @deprecated Accent styling is unified; prop is ignored for compatibility. */
  accent?: boolean;
};

export default function ChatSearchField({
  accent: _accent,
  ...props
}: ChatSearchFieldProps) {
  return <SearchInput variant="rounded" {...props} />;
}
