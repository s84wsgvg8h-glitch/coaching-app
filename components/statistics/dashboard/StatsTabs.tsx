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
    <div className="mb-6 -mx-1 overflow-x-auto px-1 scrollbar-none">
      <div className="flex w-max min-w-full gap-2 rounded-2xl border border-white/10 bg-[#0d1118]/80 p-1.5 sm:w-full sm:flex-wrap">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-brand-purple/15 text-white shadow-[inset_0_0_0_1px_rgba(168,85,247,0.35),0_0_24px_rgba(168,85,247,0.12)]"
                : "text-app-muted hover:bg-white/5 hover:text-app-text"
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
