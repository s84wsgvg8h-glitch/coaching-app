"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/design-system";

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
  mobileFooter?: ReactNode;
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
  mobileFooter,
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
      className={`profile-settings-root mx-auto flex w-full min-w-0 flex-col gap-3 ${
        fullWidth ? "max-w-none" : "max-w-5xl"
      }`}
    >
      {mobileHeaderExtra ? <div className="lg:hidden">{mobileHeaderExtra}</div> : null}

      <PageHeader title={title} description={subtitle} actions={headerExtra} />

      <nav
        className="profile-settings-mobile-nav -mx-2 px-2 lg:hidden"
        aria-label="Profiel secties"
      >
        {sections.map((section) => {
          const active = section.id === activeSection;
          const Icon = section.icon;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionChange(section.id)}
              className={`profile-settings-mobile-pill app-focus-ring ${
                active
                  ? "is-active !border-app-accent !bg-app-accent !text-white"
                  : "!bg-app-surface hover:!bg-app-surface-hover hover:!text-app-text"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
              {section.label}
            </button>
          );
        })}
      </nav>

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <nav
          className="profile-settings-sidebar hidden w-full shrink-0 lg:sticky lg:top-4 lg:block lg:w-56 xl:w-60"
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
                        className={`profile-settings-nav-btn app-focus-ring min-h-[40px] ${
                          active ? "is-active !text-app-accent" : ""
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        {Icon ? (
                          <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
                        ) : null}
                        <span className="min-w-0 leading-snug">{section.label}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="profile-settings-main !rounded-2xl md:!p-6">
          <div key={activeSection} className="profile-section-enter">
            {children}
          </div>
        </div>
      </div>

      {mobileFooter ? (
        <div className="profile-settings-mobile-footer lg:hidden">{mobileFooter}</div>
      ) : null}
    </div>
  );
}
