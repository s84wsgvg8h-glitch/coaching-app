"use client";

import SearchInput from "@/components/ui/SearchInput";

type AthletesSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function AthletesSearchBar({ value, onChange }: AthletesSearchBarProps) {
  return (
    <SearchInput
      collapsible
      value={value}
      onChange={onChange}
      placeholder="Zoek atleet..."
      variant="pill"
      className="athletes-search-bar"
    />
  );
}
