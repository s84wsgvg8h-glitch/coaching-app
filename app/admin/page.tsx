"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AdminAnalyticsTab from "@/components/admin/AdminAnalyticsTab";
import AdminCoachesTab from "@/components/admin/AdminCoachesTab";
import AdminInvitesTab from "@/components/admin/AdminInvitesTab";
import AdminKnowledgeTab from "@/components/admin/AdminKnowledgeTab";
import AdminOrganizationsTab from "@/components/admin/AdminOrganizationsTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import AdminSystemTab from "@/components/admin/AdminSystemTab";
import AdminTabNav, {
  ADMIN_TABS,
  type AdminTabId,
} from "@/components/admin/AdminTabNav";
import AdminUsersTab, { type AdminUser } from "@/components/admin/AdminUsersTab";
import { supabase } from "@/lib/supabaseClient";

function isAdminTab(value: string | null): value is AdminTabId {
  return ADMIN_TABS.some((tab) => tab.id === value);
}

function AdminPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: AdminTabId = isAdminTab(tabParam) ? tabParam : "users";

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [adminId, setAdminId] = useState("");

  const reloadUsers = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_users");

    if (error) {
      alert(error.message);
      return;
    }

    setUsers((data || []) as AdminUser[]);
  }, []);

  useEffect(() => {
    document.title = "Admin";

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setAdminId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        window.location.href = "/dashboard";
        return;
      }

      await reloadUsers();
      setLoading(false);
    }

    void load();
  }, [reloadUsers]);

  async function deleteUser(userId: string) {
    const confirmed = window.confirm(
      "Weet je zeker dat je deze gebruiker permanent wilt verwijderen?",
    );
    if (!confirmed) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/admin/delete-user", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({ userId }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      alert(payload.error || "Verwijderen mislukt.");
      return;
    }

    setUsers((current) => current.filter((user) => user.id !== userId));
  }

  const tabTitles: Record<AdminTabId, { title: string; subtitle: string }> = {
    users: {
      title: "Gebruikers",
      subtitle: "Overzicht van coaches, atleten en koppelingen.",
    },
    coaches: {
      title: "Coach-goedkeuring",
      subtitle: "Keur aanmeldingen goed of af met reviewnotities.",
    },
    settings: {
      title: "Platforminstellingen",
      subtitle: "Onderhoud, welkomsttekst, flags, banners en e-mailtemplates.",
    },
    analytics: {
      title: "Analytics",
      subtitle: "Platformstatistieken, invulscores en groei.",
    },
    invites: {
      title: "Uitnodigingen",
      subtitle: "Coach signup-links en atleet-uitnodigingen beheren.",
    },
    kennisbank: {
      title: "Kennisbank editor",
      subtitle: "Database-chunks die worden samengevoegd met de kennisbank.",
    },
    system: {
      title: "Systeem",
      subtitle: "Supabase health en kalender sync logs.",
    },
    organizations: {
      title: "Organisaties",
      subtitle: "Multi-coach organisaties en toewijzingen.",
    },
  };

  const header = tabTitles[activeTab];

  return (
    <AppShell contentClassName="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Beheer
          </p>
          <h1 className="text-3xl font-bold text-black">{header.title}</h1>
          <p className="mt-2 text-gray-500">{header.subtitle}</p>
        </div>

        <AdminTabNav activeTab={activeTab} />

        {loading ? (
          <p className="text-sm text-gray-500">Laden...</p>
        ) : (
          <>
            {activeTab === "users" && (
              <AdminUsersTab users={users} onUsersChange={setUsers} />
            )}
            {activeTab === "coaches" && (
              <AdminCoachesTab
                users={users}
                adminId={adminId}
                onReload={reloadUsers}
                onDeleteUser={deleteUser}
              />
            )}
            {activeTab === "settings" && <AdminSettingsTab />}
            {activeTab === "analytics" && <AdminAnalyticsTab />}
            {activeTab === "invites" && <AdminInvitesTab adminId={adminId} />}
            {activeTab === "kennisbank" && <AdminKnowledgeTab />}
            {activeTab === "system" && <AdminSystemTab />}
            {activeTab === "organizations" && (
              <AdminOrganizationsTab users={users} onReload={reloadUsers} />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-500">Laden...</p>}>
      <AdminPageContent />
    </Suspense>
  );
}
