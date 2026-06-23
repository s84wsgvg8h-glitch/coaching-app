"use client";

import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";

type AdminTopBarProps = {
  onSearchClick?: () => void;
};

export default function AdminTopBar({ onSearchClick }: AdminTopBarProps) {
  const { profile } = useAuth();
  const fullName = profile?.full_name || "Admin";
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <header className="admin-topbar">
      <button
        type="button"
        onClick={onSearchClick}
        className="admin-topbar-search app-focus-ring"
      >
        <Search className="h-4 w-4 shrink-0 text-app-muted" />
        <span className="admin-topbar-search-text">Zoek overal…</span>
        <kbd className="admin-topbar-kbd">⌘ K</kbd>
      </button>

      <div className="admin-topbar-actions">
        <ThemeToggle compact className="shrink-0" />
        <button
          type="button"
          className="admin-topbar-icon-btn app-focus-ring"
          aria-label="Notificaties"
        >
          <Bell className="h-4 w-4" />
        </button>

        <Link href="/profile" className="admin-topbar-profile app-focus-ring">
          <span className="admin-topbar-avatar">{initials || "AD"}</span>
          <span className="hidden min-w-0 sm:block">
            <span className="admin-topbar-profile-name">{fullName}</span>
            <span className="admin-topbar-profile-role">Superadmin</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
