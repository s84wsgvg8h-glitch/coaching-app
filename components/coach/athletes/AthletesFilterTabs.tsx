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
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {FILTERS.map((filter) => {
        const isActive = value === filter.key;
        const isAchterstand = filter.key === "non-compliant";

        let activeClass = "athletes-filter-tab text-app-muted";
        if (isActive) {
          activeClass = isAchterstand
            ? "athletes-filter-tab athletes-filter-tab--active athletes-filter-tab--warning"
            : "athletes-filter-tab athletes-filter-tab--active";
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
            className={`app-focus-ring ${activeClass}`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
