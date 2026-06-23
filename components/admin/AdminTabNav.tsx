"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  ExternalLink,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  UserCheck,
  Users,
  UserPlus,
  Wrench,
} from "lucide-react";

export type AdminTabId =
  | "overview"
  | "hierarchy"
  | "users"
  | "coaches"
  | "organizations"
  | "invites"
  | "analytics"
  | "commerce"
  | "kennisbank"
  | "settings"
  | "system"
  | "audit";

type AdminTabDef = {
  id: AdminTabId;
  label: string;
  description: string;
  icon: LucideIcon;
};

type AdminNavSection = {
  id: string;
  label: string;
  tabs: AdminTabDef[];
};

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: "command",
    label: "Overzicht",
    tabs: [
      {
        id: "overview",
        label: "Dashboard",
        description: "Overzicht van je platformprestaties en belangrijke activiteiten.",
        icon: LayoutDashboard,
      },
      {
        id: "hierarchy",
        label: "Hiërarchie",
        description: "Admin → organisaties → coaches → atleten.",
        icon: GitBranch,
      },
    ],
  },
  {
    id: "people",
    label: "Mensen",
    tabs: [
      {
        id: "users",
        label: "Gebruikers",
        description: "Rollen, koppelingen en accountbeheer.",
        icon: Users,
      },
      {
        id: "coaches",
        label: "Coach-goedkeuring",
        description: "Aanmeldingen goedkeuren of afwijzen.",
        icon: UserCheck,
      },
      {
        id: "organizations",
        label: "Organisaties",
        description: "Multi-coach teams en head coaches.",
        icon: Building2,
      },
      {
        id: "invites",
        label: "Uitnodigingen",
        description: "Signup- en atleet-links.",
        icon: UserPlus,
      },
    ],
  },
  {
    id: "growth",
    label: "Groei & omzet",
    tabs: [
      {
        id: "analytics",
        label: "Analytics",
        description: "Invulscore, groei en coach-prestaties.",
        icon: Activity,
      },
      {
        id: "commerce",
        label: "Merch & omzet",
        description: "Merch-orders en platformomzet.",
        icon: ShoppingBag,
      },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    tabs: [
      {
        id: "kennisbank",
        label: "Kennisbank",
        description: "AI-kennis chunks beheren.",
        icon: MessageSquare,
      },
      {
        id: "settings",
        label: "Instellingen",
        description: "Onderhoud, flags, banners en e-mail.",
        icon: Settings,
      },
      {
        id: "audit",
        label: "Auditlog",
        description: "Goedkeuringen en platformacties.",
        icon: ScrollText,
      },
      {
        id: "system",
        label: "Systeem",
        description: "Health checks en sync logs.",
        icon: Wrench,
      },
    ],
  },
];

export const ADMIN_TABS = ADMIN_NAV_SECTIONS.flatMap((section) => section.tabs);

export function getAdminTab(id: AdminTabId) {
  return ADMIN_TABS.find((tab) => tab.id === id) ?? ADMIN_TABS[0];
}

type AdminTabNavProps = {
  activeTab: AdminTabId;
  variant?: "sidebar" | "mobile";
};

export default function AdminTabNav({
  activeTab,
  variant = "sidebar",
}: AdminTabNavProps) {
  const router = useRouter();

  if (variant === "mobile") {
    const activeTabDef = getAdminTab(activeTab);

    return (
      <div className="admin-mobile-nav lg:hidden">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-app-subtle">
          Admin sectie
        </label>
        <select
          value={activeTab}
          onChange={(event) =>
            router.push(`/admin?tab=${event.target.value}`)
          }
          className="admin-select min-h-[44px] w-full text-[14px] font-medium"
          aria-label="Admin sectie kiezen"
        >
          {ADMIN_NAV_SECTIONS.map((section) => (
            <optgroup key={section.id} label={section.label}>
              {section.tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="mt-2 text-[12px] leading-relaxed text-app-muted">
          {activeTabDef.description}
        </p>
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
          {ADMIN_TABS.slice(0, 6).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                href={`/admin?tab=${tab.id}`}
                className={`admin-mobile-tab app-focus-ring ${
                  isActive ? "is-active" : ""
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <nav className="admin-sidebar-nav" aria-label="Admin secties">
      <div className="admin-sidebar-logo">
        <span className="admin-sidebar-logo-mark" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="admin-sidebar-logo-text">Limitless Coaching</span>
      </div>

      <div className="admin-sidebar-brand">
        <Shield className="h-4 w-4 text-sky-400" />
        <div className="min-w-0">
          <p className="admin-sidebar-brand-title">Platform Admin</p>
          <p className="admin-sidebar-brand-sub">Limitless Coaching</p>
        </div>
      </div>

      <div className="admin-sidebar-scroll">
        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.id} className="admin-sidebar-section">
            <p className="admin-sidebar-section-label">{section.label}</p>
            <ul className="admin-sidebar-links">
              {section.tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <li key={tab.id}>
                    <Link
                      href={`/admin?tab=${tab.id}`}
                      className={`admin-sidebar-link app-focus-ring ${
                        isActive ? "is-active" : ""
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="admin-sidebar-footer">
        <Link
          href="/dashboard"
          className="admin-sidebar-footer-link app-focus-ring"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          Platform bekijken
        </Link>
        <p className="admin-sidebar-version">Versie 2.4.0</p>
      </div>
    </nav>
  );
}
