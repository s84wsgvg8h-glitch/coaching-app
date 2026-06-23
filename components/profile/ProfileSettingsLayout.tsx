"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type ProfileSettingsSection = {
  id: string;
  label: string;
  group?: string;
  icon?: LucideIcon;
};

type ProfileSettingsLayoutProps = {
  title: string;
  subtitle?: string;
  sections: ProfileSettingsSection[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  headerExtra?: ReactNode;
  mobileHeaderExtra?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
};

export default function ProfileSettingsLayout({
  title,
  subtitle,
  sections,
  activeSection,
  onSectionChange,
  headerExtra,
  mobileHeaderExtra,
  fullWidth = false,
  children,
}: ProfileSettingsLayoutProps) {
  const groups = sections.reduce<string[]>((acc, section) => {
    const group = section.group || "Algemeen";
    if (!acc.includes(group)) acc.push(group);
    return acc;
  }, []);

  return (
    <div
      className={`profile-settings-root flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5 ${
        fullWidth ? "w-full max-w-none" : "mx-auto max-w-6xl"
      }`}
    >
      {mobileHeaderExtra ? (
        <div className="order-first lg:hidden">{mobileHeaderExtra}</div>
      ) : null}

      <nav
        className="profile-settings-sidebar w-full shrink-0 lg:sticky lg:top-4 lg:w-56 xl:w-60"
        aria-label="Profiel navigatie"
      >
        {groups.map((group) => (
          <div key={group} className="profile-settings-sidebar-group">
            <p className="profile-settings-sidebar-label">{group}</p>
            <div className="space-y-0.5">
              {sections
                .filter((section) => (section.group || "Algemeen") === group)
                .map((section) => {
                  const active = section.id === activeSection;
                  const Icon = section.icon;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => onSectionChange(section.id)}
                      className={`profile-settings-nav-btn app-focus-ring ${
                        active ? "is-active" : ""
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      {Icon ? (
                        <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
                      ) : null}
                      <span className="min-w-0 truncate">{section.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="profile-settings-main">
        <div className="profile-settings-main-header">
          <div className="min-w-0">
            <h1 className="profile-settings-title">{title}</h1>
            {subtitle ? (
              <p className="profile-settings-subtitle">{subtitle}</p>
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
