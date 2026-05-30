"use client";

import type { ReactNode } from "react";

export type ProfileSettingsSection = {
  id: string;
  label: string;
  group?: string;
};

type ProfileSettingsLayoutProps = {
  title: string;
  subtitle?: string;
  sections: ProfileSettingsSection[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  headerExtra?: ReactNode;
  children: ReactNode;
};

export default function ProfileSettingsLayout({
  title,
  subtitle,
  sections,
  activeSection,
  onSectionChange,
  headerExtra,
  children,
}: ProfileSettingsLayoutProps) {
  const groups = sections.reduce<string[]>((acc, section) => {
    const group = section.group || "Algemeen";
    if (!acc.includes(group)) acc.push(group);
    return acc;
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-start">
      <nav className="w-full shrink-0 rounded-3xl bg-app-sidebar p-4 shadow-xl lg:sticky lg:top-6 lg:w-64">
        {groups.map((group) => (
          <div key={group} className="mb-4 last:mb-0">
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-app-muted">
              {group}
            </p>
            <div className="space-y-1">
              {sections
                .filter((section) => (section.group || "Algemeen") === group)
                .map((section) => {
                  const active = section.id === activeSection;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => onSectionChange(section.id)}
                      className={`app-focus-ring w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                        active
                          ? "bg-app-primary text-app-primary-fg"
                          : "text-app-text hover:bg-app-surface-hover"
                      }`}
                    >
                      {section.label}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="min-w-0 flex-1 rounded-3xl bg-app-surface p-6 shadow-xl md:p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-app-text">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-app-muted">{subtitle}</p>
            ) : null}
          </div>
          {headerExtra}
        </div>
        <div key={activeSection} className="profile-section-enter">
          {children}
        </div>
      </div>
    </div>
  );
}
