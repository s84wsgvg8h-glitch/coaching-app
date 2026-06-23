"use client";

export type AthletesQuickFilter = "all" | "non-compliant" | "meet-prep";

const FILTERS: Array<{ key: AthletesQuickFilter; label: string }> = [
  { key: "all", label: "Alle" },
  { key: "non-compliant", label: "Achterstand" },
  { key: "meet-prep", label: "Meet prep" },
];

type AthletesFilterTabsProps = {
  value: AthletesQuickFilter;
  onChange: (value: AthletesQuickFilter) => void;
  className?: string;
};

export default function AthletesFilterTabs({
  value,
  onChange,
  className = "",
}: AthletesFilterTabsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {FILTERS.map((filter) => {
        const isActive = value === filter.key;
        const isAchterstand = filter.key === "non-compliant";

        let activeClass = "border-app-border/70 text-app-muted hover:border-app-border hover:text-app-text";
        if (isActive) {
          if (isAchterstand) {
            activeClass =
              "athletes-filter-tab-active athletes-filter-tab-active--warning border-amber-500/50 text-amber-300";
          } else {
            activeClass =
              "athletes-filter-tab-active border-app-accent/50 text-app-accent";
          }
        }

        return (
          <button
            key={filter.key}
            type="button"
            onClick={() => onChange(filter.key)}
            title={
              isAchterstand
                ? "Atleten met lage invulscore of weinig activiteit"
                : undefined
            }
            className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition app-focus-ring ${activeClass}`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
