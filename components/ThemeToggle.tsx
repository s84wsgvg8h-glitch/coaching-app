"use client";

import { useTheme } from "@/components/ThemeProvider";

type ThemeToggleProps = {
  className?: string;
  compact?: boolean;
};

export default function ThemeToggle({
  className = "",
  compact = false,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="group"
      aria-label="Thema kiezen"
    >
      {!compact && (
        <span className="text-sm font-semibold text-app-muted">Weergave</span>
      )}

      <div className="inline-flex rounded-xl border border-app-border bg-app-surface p-1">
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`min-h-[44px] min-w-[44px] rounded-lg px-3 py-2 text-xs font-bold transition sm:min-w-0 ${
            !isDark
              ? "bg-app-primary text-app-primary-fg shadow-sm"
              : "text-app-muted hover:text-app-text"
          }`}
          aria-pressed={!isDark}
        >
          Licht
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`min-h-[44px] min-w-[44px] rounded-lg px-3 py-2 text-xs font-bold transition sm:min-w-0 ${
            isDark
              ? "bg-app-primary text-app-primary-fg shadow-sm"
              : "text-app-muted hover:text-app-text"
          }`}
          aria-pressed={isDark}
        >
          Donker
        </button>
      </div>
    </div>
  );
}
