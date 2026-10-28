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
import ProfileLanguageToggle from "@/components/profile/ProfileLanguageToggle";
import { useLocale } from "@/components/LocaleProvider";
import { AthleteProfileSkeleton } from "@/components/mobile/AthleteMobileSkeletons";
import { updateProfileAvatar, uploadAvatar, toStorageMetadata } from "@/lib/chatAvatars";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  PROFILE_DETAILS_SELECT,
  type ProfileDetailsRow,
} from "@/lib/profileDetails";
import "@/styles/profile-settings.css";

function ProfilePageContent() {
  const router = useRouter();
  const { t, locale } = useLocale();
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

    let cancelled = false;

    async function loadProfileDetails() {
      const client = getRealSupabase();
      const { data } = await client
        .from("profiles")
        .select(PROFILE_DETAILS_SELECT)
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;

      setEmail(authEmail);
      setEditedEmail(authEmail);

      if (data) {
        const row = data as ProfileDetailsRow;
        setEditedFullName(row.full_name || authProfile?.full_name || "");
        setRole(row.role || authRole || "");
        setLidnummer(row.lidnummer || "");
        setGeboortedatum(row.geboortedatum || "");
        setGoalsText(row.goals_text || "");
        setAvatarUrl(row.avatar_url || null);
        setBusinessName(row.business_name || authProfile?.business_name || "");
      }

      setProfileLoaded(true);
    }

    void loadProfileDetails();

    return () => {
      cancelled = true;
    };
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
        { id: "account", label: t("profile.account"), group: t("common.general"), icon: User },
        {
          id: "subscription",
          label: t("profile.subscription"),
          group: t("common.general"),
          icon: CreditCard,
        },
        { id: "maxes", label: t("profile.maxes"), group: t("common.training"), icon: Dumbbell },
        {
          id: "athlete",
          label: t("profile.athleteDetails"),
          group: t("common.training"),
          icon: IdCard,
        },
        { id: "intake", label: t("profile.intake"), group: t("common.training"), icon: ClipboardList },
        { id: "injuries", label: t("profile.injuries"), group: t("common.training"), icon: HeartPulse },
        {
          id: "preferences",
          label: t("profile.preferences"),
          group: t("common.general"),
          icon: Settings2,
        },
      ];
    }

    return [
      { id: "account", label: t("profile.account"), group: t("common.general"), icon: User },
      {
        id: "settings",
        label: t("profile.settings"),
        group: t("common.platform"),
        icon: SlidersHorizontal,
      },
      {
        id: "preferences",
        label: t("profile.preferences"),
        group: t("common.general"),
        icon: Settings2,
      },
    ];
  }, [role, locale, t]);

  function setSection(sectionId: string) {
    router.replace(`/profile?section=${sectionId}`, { scroll: false });
  }

  async function saveProfile(clearPasswordAfterSave = true) {
    if (!editedFullName.trim()) {
      setMessage(t("profile.nameRequired"));
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
      setMessage(t("profile.saveFailed"));
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
        setMessage(t("profile.authSaveFailed"));
        return;
      }
    }

    setEmail(editedEmail.trim());
    if (clearPasswordAfterSave) {
      setEditedPassword("");
    }
    setSaving(false);
    setMessage(t("profile.saved"));
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
      setMessage(error?.message || t("profile.photoFailed"));
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
    setMessage(t("profile.photoSaved"));
  }

  const sectionTitle =
    sections.find((section) => section.id === activeSection)?.label || t("profile.title");

  const sectionSubtitle =
    activeSection === "account"
      ? t("profile.accountSubtitle")
      : activeSection === "preferences"
        ? t("profile.preferencesSubtitle")
        : activeSection === "settings"
          ? t("profile.settingsSubtitle")
          : t("profile.defaultSubtitle");

  if (!userId) {
    return (
      <AppShell contentClassName="app-page-content flex-1 px-2 pt-0 md:p-6 lg:px-8">
        <AthleteProfileSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell contentClassName="app-page-content flex-1 px-2 pt-0 md:p-6 lg:px-8">
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
                {t("common.dashboard")}
              </Link>
            ) : null}
            <div className="hidden sm:block">
              <ProfileLogoutButton />
            </div>
          </div>
        }
        mobileFooter={<ProfileLogoutButton />}
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
                  {editedFullName || t("profile.unnamed")}
                </p>
                <p className="truncate text-sm text-app-muted">{email || "—"}</p>
                <label className="profile-avatar-btn mt-3">
                  {t("profile.changePhoto")}
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
                <span className="profile-field-label">{t("profile.fullName")}</span>
                <input
                  type="text"
                  value={editedFullName}
                  onChange={(event) => setEditedFullName(event.target.value)}
                  className="profile-field-input"
                />
              </label>
              <label className="profile-field">
                <span className="profile-field-label">{t("profile.email")}</span>
                <input
                  type="email"
                  value={editedEmail}
                  onChange={(event) => setEditedEmail(event.target.value)}
                  className="profile-field-input"
                />
              </label>
              <label className="profile-field">
                <span className="profile-field-label">{t("profile.newPassword")}</span>
                <input
                  type="password"
                  value={editedPassword}
                  onChange={(event) => setEditedPassword(event.target.value)}
                  onBlur={() => void savePasswordOnBlur()}
                  placeholder={t("profile.passwordPlaceholder")}
                  className="profile-field-input"
                />
              </label>
              <div className="profile-field">
                <span className="profile-field-label">{t("profile.role")}</span>
                <div className="profile-field-readonly">{role}</div>
              </div>
              {isCoachLikeRole(role) ? (
                <label className="profile-field md:col-span-2">
                  <span className="profile-field-label">{t("profile.businessName")}</span>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder={t("profile.businessNamePlaceholder")}
                    className="profile-field-input"
                  />
                </label>
              ) : null}
            </div>

            <div className="profile-save-status">
              {saving ? <span>{t("common.saving")}</span> : null}
              {message ? <span>{message}</span> : null}
              {!saving && !message ? <span>{t("profile.autoSave")}</span> : null}
            </div>

            <div className="profile-account-danger-zone space-y-3">
              <ProfileDeleteAccountSection />
            </div>
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
              <p className="profile-pref-card-title">{t("profile.language")}</p>
              <p className="profile-pref-card-desc">{t("profile.languageDesc")}</p>
              <div className="profile-pref-card-body">
                <ProfileLanguageToggle />
              </div>
            </div>
            <div className="profile-pref-card">
              <p className="profile-pref-card-title">{t("profile.display")}</p>
              <p className="profile-pref-card-desc">{t("profile.displayDesc")}</p>
              <div className="profile-pref-card-body">
                <ThemeToggle compact />
              </div>
            </div>
            {userId ? (
              <div className="profile-pref-card">
                <p className="profile-pref-card-title">{t("profile.pushNotifications")}</p>
                <p className="profile-pref-card-desc">{t("profile.pushNotificationsDesc")}</p>
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
        <AppShell contentClassName="app-page-content flex-1 px-2 pt-0 md:p-6">
          <AthleteProfileSkeleton />
        </AppShell>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
