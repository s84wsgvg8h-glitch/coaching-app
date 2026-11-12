"use client";

type StatsTabsProps<T extends string> = {
  tabs: Array<{ id: T; label: string }>;
  activeTab: T;
  onChange: (tab: T) => void;
};

export default function StatsTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
}: StatsTabsProps<T>) {
  return (
    <div className="-mx-1 mb-4 overflow-x-auto px-1 [scrollbar-width:none]">
      <div className="flex w-max min-w-full gap-1 rounded-2xl border border-app-border bg-app-surface p-1.5 sm:w-full sm:flex-wrap">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`app-focus-ring min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold transition ${
              active
                ? "bg-app-accent text-white"
                : "text-app-muted hover:bg-app-surface-hover hover:text-app-text"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
      </div>
    </div>
  );
}
