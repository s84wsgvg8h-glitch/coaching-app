"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import AthleteProfileSection from "@/components/AthleteProfileSection";
import BodyAreaDiagram from "@/components/BodyAreaDiagram";
import IntakeAnswersSection from "@/components/IntakeAnswersSection";
import ProfileRpeTableSection from "@/components/profile/ProfileRpeTableSection";
import ProfileSettingsPanel from "@/components/profile/ProfileSettingsPanel";
import ProfileSettingsLayout, {
  type ProfileSettingsSection,
} from "@/components/profile/ProfileSettingsLayout";
import CoachAthleteNotesSection, {
  canViewCoachNotes,
} from "@/components/profile/CoachAthleteNotesSection";
import AthleteGoalsSection from "@/components/profile/AthleteGoalsSection";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { getChatReturnRoute } from "@/lib/chatNavigation";
import { isCoachLikeRole } from "@/lib/authRoles";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  lidnummer: string | null;
  geboortedatum: string | null;
};

function UserProfilePageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = params.id as string;
  const activeSection = searchParams.get("section") || "athlete";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewerId, setViewerId] = useState("");
  const [viewerRole, setViewerRole] = useState("");
  const [chatBackHref, setChatBackHref] = useState("/chat");

  async function loadProfile() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: viewerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setViewerId(user.id);
    setViewerRole(viewerProfile?.role || "");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, lidnummer, geboortedatum")
      .eq("id", profileId)
      .single();

    if (error || !data) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(data);
    setLoading(false);
  }

  useEffect(() => {
    void loadProfile();
    setChatBackHref(getChatReturnRoute());
  }, [profileId]);

  const roleLabel =
    profile?.role === "coach"
      ? "Coach"
      : profile?.role === "atleet"
        ? "Atleet"
        : profile?.role || "Gebruiker";

  const canEdit = Boolean(profile && (viewerId === profile.id || isCoachLikeRole(viewerRole)));
  const canEditPayment = Boolean(
    profile && isCoachLikeRole(viewerRole) && profile.role === "atleet",
  );
  const canEditAthleteAdminFields = Boolean(
    profile && isCoachLikeRole(viewerRole) && profile.role === "atleet",
  );
  const backHref = isCoachLikeRole(viewerRole)
    ? "/athletes?tab=profielen"
    : chatBackHref;
  const backLabel = isCoachLikeRole(viewerRole)
    ? "← Terug naar atleten"
    : "← Terug naar chat";

  const sections = useMemo<ProfileSettingsSection[]>(() => {
    if (profile?.role === "atleet") {
      const base: ProfileSettingsSection[] = [
        { id: "athlete", label: "Atleetgegevens", group: "Algemeen" },
        { id: "settings", label: "Instellingen", group: "Algemeen" },
        { id: "maxes", label: "Current maxes & RPE", group: "Training" },
        { id: "goals", label: "Doelen", group: "Training" },
        { id: "intake", label: "Intake", group: "Training" },
        { id: "injuries", label: "Blessures", group: "Training" },
      ];

      if (canViewCoachNotes(viewerRole, viewerId, profile.id)) {
        base.splice(2, 0, {
          id: "coach-notes",
          label: "Coach notities",
          group: "Coach",
        });
      }

      return base;
    }

    return [{ id: "overview", label: "Overzicht", group: "Algemeen" }];
  }, [profile?.role, profile?.id, viewerId, viewerRole]);

  function setSection(sectionId: string) {
    router.replace(`/profile/${profileId}?section=${sectionId}`);
  }

  if (loading) {
    return (
      <AppShell contentClassName="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <SkeletonCard />
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell contentClassName="flex-1 p-4 md:p-6">
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <p className="text-gray-500">Profiel niet gevonden.</p>
        </div>
      </AppShell>
    );
  }

  const sectionTitle =
    sections.find((section) => section.id === activeSection)?.label ||
    profile.full_name ||
    "Profiel";

  return (
    <AppShell contentClassName="flex-1 p-4 pb-16 md:p-6">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black shadow"
      >
        {backLabel}
      </Link>

      <ProfileSettingsLayout
        title={sectionTitle}
        subtitle={`${profile.full_name || "Onbekende gebruiker"} · ${roleLabel}`}
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setSection}
      >
        {activeSection === "overview" && (
          <div>
            <p className="text-sm text-app-muted">{roleLabel}</p>
          </div>
        )}

        {activeSection === "athlete" && profile.role === "atleet" && (
          <AthleteProfileSection
            athleteId={profile.id}
            canEdit={canEdit}
            canEditStartingPrs={canEditAthleteAdminFields}
            canEditCompetitions={canEditAthleteAdminFields}
            canEditPayment={canEditPayment}
            initialGeboortedatum={profile.geboortedatum}
            initialLidnummer={profile.lidnummer}
            onSaved={() => void loadProfile()}
          />
        )}

        {activeSection === "settings" &&
          profile.role === "atleet" &&
          canEditAthleteAdminFields && (
            <ProfileSettingsPanel
              coachUserId={viewerId}
              athleteId={profile.id}
            />
          )}

        {activeSection === "maxes" && profile.role === "atleet" && (
          <ProfileRpeTableSection
            athleteId={profile.id}
            canEditMaxes={canEditAthleteAdminFields}
          />
        )}

        {activeSection === "intake" && profile.role === "atleet" && (
          <IntakeAnswersSection athleteId={profile.id} collapsible />
        )}

        {activeSection === "coach-notes" &&
          profile.role === "atleet" &&
          canViewCoachNotes(viewerRole, viewerId, profile.id) && (
            <CoachAthleteNotesSection
              coachId={viewerId}
              athleteId={profile.id}
            />
          )}

        {activeSection === "goals" && profile.role === "atleet" && (
          <AthleteGoalsSection
            athleteId={profile.id}
            canEdit={viewerId === profile.id || canEditAthleteAdminFields}
          />
        )}

        {activeSection === "injuries" && profile.role === "atleet" && (
          <BodyAreaDiagram athleteId={profile.id} canEdit={canEdit} />
        )}
      </ProfileSettingsLayout>
    </AppShell>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense
      fallback={
        <AppShell contentClassName="flex-1 p-6">Profiel laden...</AppShell>
      }
    >
      <UserProfilePageContent />
    </Suspense>
  );
}
