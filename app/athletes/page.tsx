"use client";

import "@/styles/athletes-crm.css";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  buildCoachInviteUrl,
  createCoachInviteLink,
  deactivateCoachInviteLink,
  loadCoachInviteLinks,
  type CoachInviteLink,
} from "@/lib/coachInviteLinks";
import { isAdminRole, isCoachLikeRole } from "@/lib/authRoles";
import { syncAthleteOrganizationFromCoach } from "@/lib/orgAthleteScope";
import AthleteOverviewPanel from "@/components/coach/AthleteOverviewPanel";
import AthletesCrmLayout from "@/components/coach/athletes/AthletesCrmLayout";
import AthletesInvitePanel from "@/components/coach/athletes/AthletesInvitePanel";

type Profile = {
  id: string;
  full_name: string;
  role: string;
  coach_id?: string | null;
  pending_kind?: string;
};

function AthletesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { userId, role, loading: authLoading } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inviteLinks, setInviteLinks] = useState<CoachInviteLink[]>([]);
  const [creatingLink, setCreatingLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState("");
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);

  useEffect(() => {
    if (tabParam) {
      router.replace("/athletes", { scroll: false });
    }
  }, [router, tabParam]);

  useEffect(() => {
    document.title = "Atleten";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    if (role !== "coach" && role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    void loadProfiles(role, userId);
  }, [authLoading, role, router, userId]);

  async function loadProfiles(viewerRole: string, viewerId: string) {
    let query = supabase.from("profiles").select("*").order("created_at", {
      ascending: false,
    });

    if (viewerRole === "coach") {
      query = query.or(
        `and(role.eq.atleet,coach_id.eq.${viewerId}),and(role.eq.pending,coach_id.eq.${viewerId})`,
      );
      setInviteLinks(await loadCoachInviteLinks(viewerId));
    }

    const { data } = await query;
    setProfiles(data || []);
  }

  const myAthletes = useMemo(
    () => profiles.filter((profile) => profile.coach_id === userId),
    [profiles, userId],
  );

  const pendingProfiles = useMemo(
    () =>
      profiles.filter(
        (profile) =>
          profile.role === "pending" &&
          profile.pending_kind !== "coach" &&
          profile.coach_id === userId,
      ),
    [profiles, userId],
  );

  async function acceptAsAthlete(profileId: string) {
    const updatePayload: {
      role: string;
      coach_id?: string;
      pending_kind?: null;
    } = {
      role: "atleet",
      pending_kind: null,
    };

    if (isCoachLikeRole(role) && !isAdminRole(role)) {
      updatePayload.coach_id = userId;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", profileId);

    if (error) {
      alert(error.message);
      return;
    }

    if (updatePayload.coach_id) {
      await syncAthleteOrganizationFromCoach(profileId, updatePayload.coach_id);
    }

    await loadProfiles(role, userId);
  }

  async function deleteProfile(profileId: string) {
    const confirmed = confirm(
      "Weet je zeker dat je deze aanvraag wilt verwijderen?",
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadProfiles(role, userId);
  }

  async function handleCreateInviteLink(requiresIntake: boolean) {
    if (!userId) return;

    setCreatingLink(true);

    const { data, error } = await createCoachInviteLink(userId, { requiresIntake });

    setCreatingLink(false);

    if (error || !data) {
      alert(error?.message || "Link kon niet worden aangemaakt.");
      return;
    }

    setInviteLinks((current) => [data, ...current]);
  }

  async function copyInviteLink(token: string) {
    const url = buildCoachInviteUrl(token);

    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken(""), 2000);
    } catch {
      prompt("Kopieer deze link:", url);
    }
  }

  async function removeInviteLink(linkId: string) {
    const { error } = await deactivateCoachInviteLink(linkId);

    if (error) {
      alert(error.message);
      return;
    }

    setInviteLinks((current) => current.filter((link) => link.id !== linkId));
  }

  const pendingForPanel = pendingProfiles.map((profile) => ({
    id: profile.id,
    fullName: profile.full_name || "Geen naam",
  }));

  if (authLoading || !userId) {
    return (
      <AppShell contentClassName="!px-0 md:!px-0 lg:!px-0">
        <AthletesCrmLayout>
          <SkeletonCard />
        </AthletesCrmLayout>
      </AppShell>
    );
  }

  return (
    <AppShell contentClassName="!px-0 md:!px-0 lg:!px-0">
      <AthletesCrmLayout>
        <AthleteOverviewPanel onInviteClick={() => setInvitePanelOpen(true)} />

        <AthletesInvitePanel
          open={invitePanelOpen}
          onClose={() => setInvitePanelOpen(false)}
          inviteLinks={inviteLinks}
          pendingProfiles={pendingForPanel}
          creatingLink={creatingLink}
          copiedToken={copiedToken}
          onCreateLink={(requiresIntake) => void handleCreateInviteLink(requiresIntake)}
          onCopyLink={(token) => void copyInviteLink(token)}
          onRemoveLink={(linkId) => void removeInviteLink(linkId)}
          onAcceptPending={(profileId) => void acceptAsAthlete(profileId)}
          onRejectPending={(profileId) => void deleteProfile(profileId)}
        />
      </AthletesCrmLayout>
    </AppShell>
  );
}

export default function AthletesPage() {
  return (
    <Suspense
      fallback={
        <AppShell contentClassName="!px-0">
          <AthletesCrmLayout>
            <SkeletonCard />
          </AthletesCrmLayout>
        </AppShell>
      }
    >
      <AthletesPageContent />
    </Suspense>
  );
}
