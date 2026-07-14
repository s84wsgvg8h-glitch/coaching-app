"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminAnalyticsTab from "@/components/admin/AdminAnalyticsTab";
import AdminAppShell from "@/components/admin/AdminAppShell";
import AdminAuditTab from "@/components/admin/AdminAuditTab";
import AdminCoachesTab from "@/components/admin/AdminCoachesTab";
import AdminCommerceTab from "@/components/admin/AdminCommerceTab";
import AdminHierarchyTab from "@/components/admin/AdminHierarchyTab";
import AdminInvitesTab from "@/components/admin/AdminInvitesTab";
import AdminKnowledgeTab from "@/components/admin/AdminKnowledgeTab";
import AdminModerationTab from "@/components/admin/AdminModerationTab";
import AdminOrganizationsTab from "@/components/admin/AdminOrganizationsTab";
import AdminOverviewTab from "@/components/admin/AdminOverviewTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import AdminShell from "@/components/admin/AdminShell";
import AdminSystemTab from "@/components/admin/AdminSystemTab";
import { ADMIN_TABS, type AdminTabId } from "@/components/admin/AdminTabNav";
import { AdminLoading } from "@/components/admin/AdminUi";
import AdminUsersTab, { type AdminUser } from "@/components/admin/AdminUsersTab";
import Toast, { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { PageLoading } from "@/components/ui/Skeleton";
import { disableDemoMode } from "@/lib/demo/demoMode";
import { getRealSupabase } from "@/lib/supabaseClient";
import { loadAuthenticatedProfile } from "@/lib/profileAuth";
import "@/styles/admin.css";

function isAdminTab(value: string | null): value is AdminTabId {
  return ADMIN_TABS.some((tab) => tab.id === value);
}

function AdminPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: AdminTabId = isAdminTab(tabParam) ? tabParam : "overview";
  const { message: toastMessage, showToast, clearToast } = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [adminId, setAdminId] = useState("");

  const reloadUsers = useCallback(async () => {
    const { data, error } = await getRealSupabase().rpc("admin_list_users");

    if (error) {
      showToast(error.message);
      return;
    }

    setUsers((data || []) as AdminUser[]);
  }, []);

  useEffect(() => {
    document.title = "Admin · Limitless";

    async function load() {
      disableDemoMode();

      const {
        data: { user },
      } = await getRealSupabase().auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setAdminId(user.id);

      const profile = await loadAuthenticatedProfile(user.id);

      if (profile?.role !== "admin") {
        window.location.href = "/dashboard";
        return;
      }

      await reloadUsers();
      setLoading(false);
    }

    void load();
  }, [reloadUsers, showToast]);

  async function deleteUser(
    userId: string,
    options?: { skipConfirm?: boolean },
  ) {
    if (userId === adminId) {
      showToast("Je kunt je eigen admin-account niet verwijderen.");
      return;
    }

    if (!options?.skipConfirm) {
      const target = users.find((user) => user.id === userId);
      const message =
        target?.role === "admin"
          ? `WAARSCHUWING: Je staat op het punt om admin "${target.full_name || target.email}" permanent te verwijderen. Dit kan niet ongedaan worden gemaakt. Doorgaan?`
          : "Weet je zeker dat je deze gebruiker permanent wilt verwijderen?";
      const confirmed = await confirm({
        title: target?.role === "admin" ? "Admin verwijderen" : "Gebruiker verwijderen",
        message,
        confirmLabel: "Verwijderen",
        tone: "danger",
      });
      if (!confirmed) return;
    }

    const {
      data: { session },
    } = await getRealSupabase().auth.getSession();

    if (!session?.access_token) {
      showToast("Sessie verlopen. Log opnieuw in.");
      return;
    }

    const response = await fetch("/api/admin/delete-user", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      showToast(payload.error || "Verwijderen mislukt.");
      return;
    }

    showToast("Gebruiker verwijderd.");

    setUsers((current) => current.filter((user) => user.id !== userId));
  }

  return (
    <div className="admin-page-root min-h-[100dvh] bg-app-bg">
      <div className="admin-shell">
        {loading ? (
          <div className="px-4 py-8">
            <AdminLoading label="Admin gegevens laden…" />
          </div>
        ) : (
          <AdminAppShell activeTab={activeTab}>
            {activeTab === "overview" ? (
              <AdminOverviewTab users={users} />
            ) : (
              <AdminShell>
                {activeTab === "hierarchy" && (
                  <AdminHierarchyTab users={users} />
                )}
                {activeTab === "users" && (
                  <AdminUsersTab
                    users={users}
                    adminId={adminId}
                    onUsersChange={setUsers}
                    onDeleteUser={deleteUser}
                  />
                )}
                {activeTab === "coaches" && (
                  <AdminCoachesTab
                    users={users}
                    adminId={adminId}
                    onReload={reloadUsers}
                    onDeleteUser={deleteUser}
                  />
                )}
                {activeTab === "settings" && (
                  <AdminSettingsTab onToast={showToast} />
                )}
                {activeTab === "analytics" && <AdminAnalyticsTab />}
                {activeTab === "commerce" && <AdminCommerceTab />}
                {activeTab === "invites" && (
                  <AdminInvitesTab adminId={adminId} />
                )}
                {activeTab === "kennisbank" && <AdminKnowledgeTab />}
                {activeTab === "audit" && <AdminAuditTab />}
                {activeTab === "moderation" && <AdminModerationTab />}
                {activeTab === "system" && <AdminSystemTab />}
                {activeTab === "organizations" && (
                  <AdminOrganizationsTab
                    users={users}
                    onReload={reloadUsers}
                  />
                )}
              </AdminShell>
            )}
          </AdminAppShell>
        )}
      </div>
      <Toast message={toastMessage} onDismiss={clearToast} />
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<PageLoading label="Admin laden…" />}>
      <AdminPageContent />
    </Suspense>
  );
}
