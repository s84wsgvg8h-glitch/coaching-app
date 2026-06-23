"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import AdminTabNav, { type AdminTabId } from "@/components/admin/AdminTabNav";
import AdminTopBar from "@/components/admin/AdminTopBar";
import CommandPalette, {
  useCommandPaletteHotkey,
} from "@/components/dashboard/CommandPalette";

type AdminAppShellProps = {
  activeTab: AdminTabId;
  children: ReactNode;
};

export default function AdminAppShell({
  activeTab,
  children,
}: AdminAppShellProps) {
  const [commandOpen, setCommandOpen] = useState(false);

  useCommandPaletteHotkey(() => setCommandOpen(true));

  return (
    <div className="admin-app">
      <aside className="admin-app-sidebar hidden lg:flex">
        <AdminTabNav activeTab={activeTab} variant="sidebar" />
      </aside>

      <div className="admin-app-main min-w-0">
        <AdminTabNav activeTab={activeTab} variant="mobile" />
        <AdminTopBar onSearchClick={() => setCommandOpen(true)} />
        <div className="admin-app-content">{children}</div>
      </div>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
