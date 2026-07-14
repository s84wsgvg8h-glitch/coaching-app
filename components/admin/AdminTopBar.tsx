"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { SearchFieldTrigger } from "@/components/ui/SearchInput";

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
      <SearchFieldTrigger
        onClick={onSearchClick}
        placeholder="Zoek overal…"
        kbd={<kbd className="admin-topbar-kbd">⌘ K</kbd>}
        kbdPosition="end"
        variant="rounded"
        className="admin-topbar-search app-focus-ring"
      />

      <div className="admin-topbar-actions">
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
