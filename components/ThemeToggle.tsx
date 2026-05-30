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
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            !isDark
              ? "bg-app-primary text-app-primary-fg shadow-sm"
              : "text-app-muted hover:text-app-text"
          }`}
          aria-pressed={!isDark}
        >
          Light
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            isDark
              ? "bg-app-primary text-app-primary-fg shadow-sm"
              : "text-app-muted hover:text-app-text"
          }`}
          aria-pressed={isDark}
        >
          Dark
        </button>
      </div>
    </div>
  );
}
