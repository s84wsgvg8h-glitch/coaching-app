"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Dumbbell,
  HeartPulse,
  IdCard,
  MessageSquareText,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import { getRealSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
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
import ProfileAdvancedSettingsPanel from "@/components/profile/ProfileAdvancedSettingsPanel";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { PageContainer, Panel } from "@/components/ui/design-system";
import { isCoachLikeRole } from "@/lib/authRoles";
import { type BlockIntakeWizard } from "@/lib/blockIntakeWizard";
import { useLogicalBack } from "@/hooks/useLogicalBack";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";
import "@/styles/profile-settings.css";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  lidnummer: string | null;
  geboortedatum: string | null;
  goals_text: string | null;
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  athlete: "Wedstrijden, doelen, betaling en persoonsgegevens.",
  settings: "Checklist, intake en coach-instellingen voor deze atleet.",
  advanced: "Video-routing, start-PR's en geavanceerde opties.",
  "coach-notes": "Privé notities — alleen zichtbaar voor coaches.",
  maxes: "Huidige maxes en RPE-tabellen.",
  intake: "Intake-antwoorden en achtergrondinformatie.",
  injuries: "Blessurehistorie en lichaamsgebieden.",
  overview: "Profieloverzicht.",
};

function UserProfilePageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = params.id as string;
  const activeSection = searchParams.get("section") || "athlete";
  const highlightField = searchParams.get("focus");

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewerId, setViewerId] = useState("");
  const [viewerRole, setViewerRole] = useState("");
  const [blockIntakeWizard, setBlockIntakeWizard] =
    useState<BlockIntakeWizard | null>(null);

  const { userId: authUserId, role: authRole, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!authUserId) {
      window.location.href = "/login";
      return;
    }

    setViewerId(authUserId);
    setViewerRole(authRole || "");
  }, [authLoading, authUserId, authRole]);

  async function loadProfile() {
    if (authLoading || !authUserId) return;

    setLoading(true);
    setViewerId(authUserId);
    setViewerRole(authRole || "");

    const client = getRealSupabase();

    const [{ data, error }, { data: wizard }] = await Promise.all([
      client
        .from("profiles")
        .select("id, full_name, role, lidnummer, geboortedatum, goals_text")
        .eq("id", profileId)
        .maybeSingle(),
      client
        .from("block_intake_wizard")
        .select("*")
        .eq("athlete_id", profileId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (error || !data) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(data);
    setBlockIntakeWizard((wizard as BlockIntakeWizard) || null);
    setLoading(false);
  }

  useEffect(() => {
    deferEffectUpdate(() => {
      void loadProfile();
    });
  }, [profileId, authUserId, authRole, authLoading]);

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
  const { href: backHref, label: backLabel } = useLogicalBack();

  const sections = useMemo<ProfileSettingsSection[]>(() => {
    if (profile?.role === "atleet") {
      const base: ProfileSettingsSection[] = [
        { id: "athlete", label: "Atleetgegevens", group: "Algemeen", icon: IdCard },
        { id: "settings", label: "Instellingen", group: "Algemeen", icon: SlidersHorizontal },
        { id: "maxes", label: "Maxes & RPE", group: "Training", icon: Dumbbell },
        { id: "intake", label: "Intake", group: "Training", icon: ClipboardList },
        { id: "injuries", label: "Blessures", group: "Training", icon: HeartPulse },
      ];

      if (canEditAthleteAdminFields) {
        base.splice(2, 0, {
          id: "advanced",
          label: "Geavanceerd",
          group: "Algemeen",
          icon: Settings2,
        });
      }

      if (canViewCoachNotes(viewerRole, viewerId, profile.id)) {
        base.splice(2, 0, {
          id: "coach-notes",
          label: "Coach notities",
          group: "Coach",
          icon: MessageSquareText,
        });
      }

      return base;
    }

    return [{ id: "overview", label: "Overzicht", group: "Algemeen", icon: IdCard }];
  }, [profile, canEditAthleteAdminFields, viewerId, viewerRole]);

  function setSection(sectionId: string) {
    router.replace(`/profile/${profileId}?section=${sectionId}`);
  }

  const pageTitle =
    profile?.role === "atleet"
      ? profile.full_name || "Atleet"
      : sections.find((section) => section.id === activeSection)?.label ||
        profile?.full_name ||
        "Profiel";

  const pageSubtitle =
    SECTION_DESCRIPTIONS[activeSection] ||
    `${profile?.full_name || "Onbekende gebruiker"} · ${roleLabel}`;

  if (loading) {
    return (
      <AppShell contentClassName={PROFILE_CONTENT_CLASS}>
        <PageContainer size="full">
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell contentClassName={PROFILE_CONTENT_CLASS}>
        <PageContainer size="full">
          <Panel className="text-center">
            <p className="text-sm text-app-muted">Profiel niet gevonden.</p>
          </Panel>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell contentClassName={PROFILE_CONTENT_CLASS}>
      <ProfileSettingsLayout
        fullWidth
        title={pageTitle}
        subtitle={pageSubtitle}
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setSection}
        headerExtra={
          <Link href={backHref} className="profile-back-link app-focus-ring !min-h-[44px] justify-center">
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            {backLabel}
          </Link>
        }
      >
        {activeSection === "overview" && (
          <div>
            <p className="text-sm text-app-muted">{roleLabel}</p>
          </div>
        )}

        {activeSection === "athlete" && profile.role === "atleet" && (
          <AthleteProfileSection
            athleteId={profile.id}
            coachId={viewerId}
            canEdit={canEdit}
            canEditStartingPrs={canEditAthleteAdminFields}
            canEditCompetitions={canEditAthleteAdminFields}
            canEditPayment={canEditPayment}
            canEditVideoSettings={canEditAthleteAdminFields}
            initialGeboortedatum={profile.geboortedatum}
            initialLidnummer={profile.lidnummer}
            initialGoalsText={profile.goals_text}
            blockIntakeWizard={blockIntakeWizard}
            highlightField={highlightField}
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

        {activeSection === "advanced" &&
          profile.role === "atleet" &&
          canEditAthleteAdminFields && (
            <ProfileAdvancedSettingsPanel athleteId={profile.id} />
          )}

        {activeSection === "maxes" && profile.role === "atleet" && (
          <ProfileRpeTableSection
            athleteId={profile.id}
            canEditMaxes={canEditAthleteAdminFields}
          />
        )}

        {activeSection === "intake" && profile.role === "atleet" && (
          <IntakeAnswersSection athleteId={profile.id} coachId={viewerId} collapsible />
        )}

        {activeSection === "coach-notes" &&
          profile.role === "atleet" &&
          canViewCoachNotes(viewerRole, viewerId, profile.id) && (
            <CoachAthleteNotesSection
              coachId={viewerId}
              athleteId={profile.id}
            />
          )}

        {activeSection === "injuries" && profile.role === "atleet" && (
          <BodyAreaDiagram athleteId={profile.id} canEdit={canEdit} />
        )}
      </ProfileSettingsLayout>
    </AppShell>
  );
}

const PROFILE_CONTENT_CLASS = "app-page-content flex-1 px-2 pb-6 md:px-3 lg:px-4";

export default function UserProfilePage() {
  return (
    <Suspense
      fallback={
        <AppShell contentClassName={PROFILE_CONTENT_CLASS}>
          <PageContainer size="full">
            <p className="text-sm text-app-muted">Profiel laden...</p>
          </PageContainer>
        </AppShell>
      }
    >
      <UserProfilePageContent />
    </Suspense>
  );
}
