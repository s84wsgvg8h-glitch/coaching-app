"use client";

import Link from "next/link";

export const ADMIN_TABS = [
  { id: "users", label: "Gebruikers" },
  { id: "coaches", label: "Coaches" },
  { id: "settings", label: "Instellingen" },
  { id: "analytics", label: "Analytics" },
  { id: "invites", label: "Uitnodigingen" },
  { id: "kennisbank", label: "Kennisbank" },
  { id: "system", label: "Systeem" },
  { id: "organizations", label: "Organisaties" },
] as const;

export type AdminTabId = (typeof ADMIN_TABS)[number]["id"];

type AdminTabNavProps = {
  activeTab: AdminTabId;
};

export default function AdminTabNav({ activeTab }: AdminTabNavProps) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {ADMIN_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/admin?tab=${tab.id}`}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
            activeTab === tab.id
              ? "bg-black text-white"
              : "bg-white text-gray-700 shadow hover:bg-gray-50"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
