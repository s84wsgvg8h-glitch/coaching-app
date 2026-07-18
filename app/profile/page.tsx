"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  CreditCard,
  Dumbbell,
  HeartPulse,
  IdCard,
  Settings2,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { getRealSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import AthleteProfileSection from "@/components/AthleteProfileSection";
import BodyAreaDiagram from "@/components/BodyAreaDiagram";
import ChatAvatar from "@/components/chat/ChatAvatar";
import IntakeAnswersSection from "@/components/IntakeAnswersSection";
import AvatarCropModal from "@/components/AvatarCropModal";
import ThemeToggle from "@/components/ThemeToggle";
import PushNotificationPrompt from "@/components/notifications/PushNotificationPrompt";
import ProfileRpeTableSection from "@/components/profile/ProfileRpeTableSection";
import ProfileSettingsPanel from "@/components/profile/ProfileSettingsPanel";
import ProfileLogoutButton from "@/components/profile/ProfileLogoutButton";
import ProfileDeleteAccountSection from "@/components/profile/ProfileDeleteAccountSection";
import ProfileCoachingSubscriptionSection from "@/components/profile/ProfileCoachingSubscriptionSection";
import ProfileSettingsLayout, {
  type ProfileSettingsSection,
} from "@/components/profile/ProfileSettingsLayout";
import { AthleteProfileSkeleton } from "@/components/mobile/AthleteMobileSkeletons";
import { updateProfileAvatar, uploadAvatar, toStorageMetadata } from "@/lib/chatAvatars";
import { isCoachLikeRole } from "@/lib/authRoles";
import "@/styles/profile-settings.css";

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") || "account";
  const { userId, role: authRole, email: authEmail, profile: authProfile } = useAuth();

  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [geboortedatum, setGeboortedatum] = useState("");
  const [lidnummer, setLidnummer] = useState("");
  const [goalsText, setGoalsText] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [editedFullName, setEditedFullName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedPassword, setEditedPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const autoSaveReady = useRef(false);
  const saveMessageTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;

    setEmail(authEmail);
    setEditedEmail(authEmail);
    if (authProfile?.full_name) {
      setEditedFullName(authProfile.full_name);
    }
    if (authRole) {
      setRole(authRole);
    }
    if (authProfile?.business_name) {
      setBusinessName(authProfile.business_name);
    }

    async function loadProfileDetails() {
      const client = getRealSupabase();
      const { data } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        setEditedFullName(data.full_name || authProfile?.full_name || "");
        setRole(data.role || authRole || "");
        setLidnummer(data.lidnummer || "");
        setGeboortedatum(data.geboortedatum || "");
        setGoalsText((data.goals_text as string | null) || "");
        setAvatarUrl(data.avatar_url || null);
        setBusinessName(data.business_name || authProfile?.business_name || "");
      }

      setProfileLoaded(true);
    }

    void loadProfileDetails();
  }, [userId, authEmail, authProfile, authRole]);

  useEffect(() => {
    autoSaveReady.current = false;

    if (profileLoaded) {
      const timer = window.setTimeout(() => {
        autoSaveReady.current = true;
      }, 150);

      return () => window.clearTimeout(timer);
    }
  }, [profileLoaded, userId]);

  useEffect(() => {
    if (!profileLoaded || !userId || !autoSaveReady.current) return;

    const timer = window.setTimeout(() => {
      void saveProfile(false);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [editedFullName, editedEmail, businessName, profileLoaded, userId]);

  useEffect(() => {
    return () => {
      if (saveMessageTimer.current) {
        window.clearTimeout(saveMessageTimer.current);
      }
    };
  }, []);

  const sections = useMemo<ProfileSettingsSection[]>(() => {
    if (role === "atleet") {
      return [
        { id: "account", label: "Account", group: "Algemeen", icon: User },
        { id: "subscription", label: "Abonnement", group: "Algemeen", icon: CreditCard },
        { id: "maxes", label: "Maxes & RPE", group: "Training", icon: Dumbbell },
        { id: "athlete", label: "Atleetgegevens", group: "Training", icon: IdCard },
        { id: "intake", label: "Intake", group: "Training", icon: ClipboardList },
        { id: "injuries", label: "Blessures", group: "Training", icon: HeartPulse },
        { id: "preferences", label: "Voorkeuren", group: "Algemeen", icon: Settings2 },
      ];
    }

    return [
      { id: "account", label: "Account", group: "Algemeen", icon: User },
      { id: "settings", label: "Instellingen", group: "Platform", icon: SlidersHorizontal },
      { id: "preferences", label: "Voorkeuren", group: "Algemeen", icon: Settings2 },
    ];
  }, [role]);

  function setSection(sectionId: string) {
    router.replace(`/profile?section=${sectionId}`, { scroll: false });
  }

  async function saveProfile(clearPasswordAfterSave = true) {
    if (!editedFullName.trim()) {
      setMessage("Vul een naam in.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error: profileError } = await getRealSupabase()
      .from("profiles")
      .update({
        full_name: editedFullName.trim(),
        ...(isCoachLikeRole(role)
          ? { business_name: businessName.trim() || null }
          : {}),
      })
      .eq("id", userId);

    if (profileError) {
      setSaving(false);
      setMessage("Er ging iets mis bij het opslaan van je profiel.");
      return;
    }

    const authUpdates: { email?: string; password?: string } = {};

    if (editedEmail.trim() && editedEmail.trim() !== email) {
      authUpdates.email = editedEmail.trim();
    }

    if (editedPassword.trim()) {
      authUpdates.password = editedPassword.trim();
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await getRealSupabase().auth.updateUser(authUpdates);

      if (authError) {
        setSaving(false);
        setMessage("Profiel opgeslagen, maar email/wachtwoord aanpassen is niet gelukt.");
        return;
      }
    }

    setEmail(editedEmail.trim());
    if (clearPasswordAfterSave) {
      setEditedPassword("");
    }
    setSaving(false);
    setMessage("Profiel opgeslagen.");
    if (saveMessageTimer.current) {
      window.clearTimeout(saveMessageTimer.current);
    }
    saveMessageTimer.current = window.setTimeout(() => {
      setMessage("");
    }, 2000);
  }

  async function savePasswordOnBlur() {
    if (!editedPassword.trim() || !userId) return;
    await saveProfile(true);
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !userId) return;
    setAvatarCropFile(file);
    event.target.value = "";
  }

  async function handleAvatarCropConfirm(croppedFile: File) {
    if (!userId) return;
    setAvatarCropFile(null);
    setSaving(true);
    const { url, storage, error } = await uploadAvatar(userId, croppedFile, "profile");

    if (error || !url) {
      setSaving(false);
      setMessage(error?.message || "Profielfoto uploaden mislukt.");
      return;
    }

    const { error: updateError } = await updateProfileAvatar(
      userId,
      url,
      storage ? toStorageMetadata(storage) : null,
    );
    setSaving(false);

    if (updateError) {
      setMessage(updateError.message);
      return;
    }

    setAvatarUrl(url);
    setMessage("Profielfoto opgeslagen.");
  }

  const sectionTitle =
    sections.find((section) => section.id === activeSection)?.label || "Profiel";

  const sectionSubtitle =
    activeSection === "account"
      ? "Naam, e-mail en profielfoto."
      : activeSection === "preferences"
        ? "Thema, weergave en notificaties."
        : activeSection === "settings"
          ? "Checklist, intake en coach-instellingen."
          : "Beheer je traininggegevens en profiel.";

  if (!userId) {
    return (
      <AppShell contentClassName="flex-1 px-2 pb-4 pt-0 md:p-6 lg:px-8">
        <AthleteProfileSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell contentClassName="flex-1 px-2 pb-4 pt-0 md:p-6 lg:px-8">
      {!profileLoaded ? (
        <AthleteProfileSkeleton />
      ) : (
      <ProfileSettingsLayout
        title={sectionTitle}
        subtitle={sectionSubtitle}
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setSection}
        fullWidth
        headerExtra={
          <div className="flex shrink-0 items-center gap-2">
            {isCoachLikeRole(role) ? (
              <Link
                href="/dashboard"
                className="profile-dashboard-link app-focus-ring hidden sm:inline-flex"
              >
                Dashboard
              </Link>
            ) : null}
            <div className="hidden sm:block">
              <ProfileLogoutButton />
            </div>
          </div>
        }
        mobileHeaderExtra={<ProfileLogoutButton />}
      >
        {activeSection === "account" && (
          <div className="space-y-6">
            <div className="profile-account-hero">
              <ChatAvatar
                name={editedFullName}
                imageUrl={avatarUrl}
                className="h-16 w-16 text-xl sm:h-20 sm:w-20 sm:text-2xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-app-text">
                  {editedFullName || "Naamloos"}
                </p>
                <p className="truncate text-sm text-app-muted">{email || "—"}</p>
                <label className="profile-avatar-btn mt-3">
                  Profielfoto wijzigen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleAvatarUpload(event)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="profile-field-grid">
              <label className="profile-field">
                <span className="profile-field-label">Volledige naam</span>
                <input
                  type="text"
                  value={editedFullName}
                  onChange={(event) => setEditedFullName(event.target.value)}
                  className="profile-field-input"
                />
              </label>
              <label className="profile-field">
                <span className="profile-field-label">E-mail</span>
                <input
                  type="email"
                  value={editedEmail}
                  onChange={(event) => setEditedEmail(event.target.value)}
                  className="profile-field-input"
                />
              </label>
              <label className="profile-field">
                <span className="profile-field-label">Nieuw wachtwoord</span>
                <input
                  type="password"
                  value={editedPassword}
                  onChange={(event) => setEditedPassword(event.target.value)}
                  onBlur={() => void savePasswordOnBlur()}
                  placeholder="Laat leeg om niet te wijzigen"
                  className="profile-field-input"
                />
              </label>
              <div className="profile-field">
                <span className="profile-field-label">Rol</span>
                <div className="profile-field-readonly">{role}</div>
              </div>
              {isCoachLikeRole(role) ? (
                <label className="profile-field md:col-span-2">
                  <span className="profile-field-label">Bedrijfsnaam</span>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder="Naam van je coachingbedrijf"
                    className="profile-field-input"
                  />
                </label>
              ) : null}
            </div>

            <div className="profile-save-status">
              {saving ? <span>Opslaan…</span> : null}
              {message ? <span>{message}</span> : null}
              {!saving && !message ? (
                <span>Wijzigingen worden automatisch opgeslagen</span>
              ) : null}
            </div>

            <ProfileDeleteAccountSection />
          </div>
        )}

        {activeSection === "subscription" && userId && role === "atleet" ? (
          <ProfileCoachingSubscriptionSection userId={userId} />
        ) : null}

        {activeSection === "maxes" && userId ? (
          <ProfileRpeTableSection athleteId={userId} canEditMaxes={false} />
        ) : null}

        {activeSection === "settings" && userId && isCoachLikeRole(role) ? (
          <ProfileSettingsPanel coachUserId={userId} />
        ) : null}

        {activeSection === "athlete" && userId && role === "atleet" ? (
          <AthleteProfileSection
            athleteId={userId}
            canEditStartingPrs={false}
            canEditCompetitions={false}
            initialGeboortedatum={geboortedatum}
            initialLidnummer={lidnummer}
            initialGoalsText={goalsText}
          />
        ) : null}

        {activeSection === "intake" && userId && role === "atleet" ? (
          <IntakeAnswersSection athleteId={userId} collapsible defaultOpen />
        ) : null}

        {activeSection === "injuries" && userId && role === "atleet" ? (
          <BodyAreaDiagram athleteId={userId} />
        ) : null}

        {activeSection === "preferences" && (
          <div className="space-y-3">
            <div className="profile-pref-card">
              <p className="profile-pref-card-title">Weergave</p>
              <p className="profile-pref-card-desc">
                Kies tussen light en dark mode voor de hele app.
              </p>
              <div className="profile-pref-card-body">
                <ThemeToggle compact />
              </div>
            </div>
            {userId ? (
              <div className="profile-pref-card">
                <p className="profile-pref-card-title">Pushnotificaties</p>
                <p className="profile-pref-card-desc">
                  Ontvang meldingen over berichten en belangrijke updates.
                </p>
                <div className="profile-pref-card-body">
                  <PushNotificationPrompt userId={userId} />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </ProfileSettingsLayout>
      )}

      {avatarCropFile ? (
        <AvatarCropModal
          file={avatarCropFile}
          onCancel={() => setAvatarCropFile(null)}
          onConfirm={(file) => void handleAvatarCropConfirm(file)}
        />
      ) : null}
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <AppShell contentClassName="flex-1 px-2 pb-4 pt-0 md:p-6">
          <AthleteProfileSkeleton />
        </AppShell>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
