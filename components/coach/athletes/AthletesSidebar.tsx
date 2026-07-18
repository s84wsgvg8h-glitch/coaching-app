"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/athletes", label: "Atleten", icon: Users },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/data", label: "Data", icon: BarChart3 },
  { href: "/todo", label: "Taken", icon: ClipboardList },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/betalingen", label: "Betalingen", icon: CreditCard },
  { href: "/coach/subscriptions", label: "Abonnementen", icon: CreditCard },
  { href: "/organisatie", label: "Organisatie", icon: Building2 },
  { href: "/profile", label: "Instellingen", icon: Settings },
] as const;

function profileInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function AthletesSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const initials = profileInitials(profile?.full_name || "Coach");

  return (
    <aside
      className="athletes-crm-sidebar hidden shrink-0 lg:flex lg:w-[72px] lg:flex-col"
      aria-label="Hoofdnavigatie"
    >
      <div className="athletes-sidebar-panel flex h-full min-h-[calc(100dvh-3.5rem)] flex-col items-center py-4">
        <Link
          href="/dashboard"
          className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent/15 text-[15px] font-bold text-app-accent shadow-[0_0_20px_rgba(79,140,255,0.25)] app-focus-ring"
          title="Limitless Coaching"
        >
          L
        </Link>

        <nav className="flex flex-1 flex-col items-center gap-1.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/athletes"
                ? pathname === "/athletes" || pathname.startsWith("/athletes/")
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition app-focus-ring ${
                  active
                    ? "athletes-sidebar-icon-active text-app-accent"
                    : "text-app-muted hover:bg-app-surface-raised/50 hover:text-app-text"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
                {active ? (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-app-accent/40"
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-3 pt-4">
          <Link
            href="/profile"
            title="Profiel"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-app-accent/20 text-[11px] font-semibold text-app-accent app-focus-ring"
          >
            {initials || "C"}
          </Link>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-app-subtle/60 transition hover:text-app-muted app-focus-ring"
            aria-label="Sidebar inklappen"
            title="Sidebar inklappen"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
