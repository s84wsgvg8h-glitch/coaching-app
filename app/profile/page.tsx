"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import AthleteProfileSection from "@/components/AthleteProfileSection";
import BodyAreaDiagram from "@/components/BodyAreaDiagram";
import ChatAvatar from "@/components/chat/ChatAvatar";
import IntakeAnswersSection from "@/components/IntakeAnswersSection";
import AvatarCropModal from "@/components/AvatarCropModal";
import AthleteGoalsSection from "@/components/profile/AthleteGoalsSection";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileRpeTableSection from "@/components/profile/ProfileRpeTableSection";
import ProfileSettingsPanel from "@/components/profile/ProfileSettingsPanel";
import ProfileSettingsLayout, {
  type ProfileSettingsSection,
} from "@/components/profile/ProfileSettingsLayout";
import { updateProfileAvatar, uploadAvatar } from "@/lib/chatAvatars";
import { isCoachLikeRole } from "@/lib/authRoles";

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") || "account";

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [geboortedatum, setGeboortedatum] = useState("");
  const [lidnummer, setLidnummer] = useState("");
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
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");
      setEditedEmail(user.email || "");

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setEditedFullName(data.full_name || "");
        setRole(data.role || "");
        setLidnummer(data.lidnummer || "");
        setGeboortedatum(data.geboortedatum || "");
        setAvatarUrl(data.avatar_url || null);
        setBusinessName(data.business_name || "");
      }

      setProfileLoaded(true);
    }

    getProfile();
  }, []);

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
        { id: "account", label: "Account", group: "Algemeen" },
        { id: "maxes", label: "Current maxes & RPE", group: "Training" },
        { id: "athlete", label: "Atleetgegevens", group: "Training" },
        { id: "intake", label: "Intake", group: "Training" },
        { id: "injuries", label: "Blessures", group: "Training" },
        { id: "goals", label: "Doelen", group: "Training" },
        { id: "preferences", label: "Voorkeuren", group: "Algemeen" },
      ];
    }

    return [
      { id: "account", label: "Account", group: "Algemeen" },
      { id: "settings", label: "Instellingen", group: "Algemeen" },
      { id: "preferences", label: "Voorkeuren", group: "Algemeen" },
    ];
  }, [role]);

  function setSection(sectionId: string) {
    router.replace(`/profile?section=${sectionId}`);
  }

  async function saveProfile(clearPasswordAfterSave = true) {
    if (!editedFullName.trim()) {
      setMessage("Vul een naam in.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error: profileError } = await supabase
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
      const { error: authError } = await supabase.auth.updateUser(authUpdates);

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
    const { url, error } = await uploadAvatar(userId, croppedFile, "profile");

    if (error || !url) {
      setSaving(false);
      setMessage(error?.message || "Profielfoto uploaden mislukt.");
      return;
    }

    const { error: updateError } = await updateProfileAvatar(userId, url);
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

  return (
    <AppShell contentClassName="flex-1 p-4 pb-16 md:p-6">
      <ProfileSettingsLayout
        title={sectionTitle}
        subtitle="Beheer je account en traininginstellingen."
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setSection}
      >
        {activeSection === "account" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <ChatAvatar
                name={editedFullName}
                imageUrl={avatarUrl}
                className="h-20 w-20 text-2xl"
              />
              <label className="cursor-pointer rounded-2xl bg-gray-100 px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200">
                Profielfoto wijzigen
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleAvatarUpload(event)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Volledige naam
                </label>
                <input
                  type="text"
                  value={editedFullName}
                  onChange={(event) => setEditedFullName(event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Email</label>
                <input
                  type="email"
                  value={editedEmail}
                  onChange={(event) => setEditedEmail(event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Nieuw wachtwoord
                </label>
                <input
                  type="password"
                  value={editedPassword}
                  onChange={(event) => setEditedPassword(event.target.value)}
                  onBlur={() => void savePasswordOnBlur()}
                  placeholder="Laat leeg als je niks wilt wijzigen"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Rol</label>
                <div className="w-full rounded-2xl bg-gray-100 px-4 py-3 capitalize text-gray-600">
                  {role}
                </div>
              </div>
              {isCoachLikeRole(role) ? (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold">
                    Business name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder="Naam van je coachingbedrijf"
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              ) : null}
            </div>

            <div className="flex min-h-6 items-center gap-3 text-sm text-gray-500">
              {saving ? <span>Opslaan...</span> : null}
              {message ? <span>{message}</span> : null}
              {!saving && !message ? (
                <span>Wijzigingen worden automatisch opgeslagen</span>
              ) : null}
            </div>
          </div>
        )}

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
            onSaved={async () => {
              const { data } = await supabase
                .from("profiles")
                .select("geboortedatum, lidnummer")
                .eq("id", userId)
                .single();

              if (data) {
                setGeboortedatum(data.geboortedatum || "");
                setLidnummer(data.lidnummer || "");
              }
            }}
          />
        ) : null}

        {activeSection === "intake" && userId && role === "atleet" ? (
          <IntakeAnswersSection athleteId={userId} collapsible defaultOpen />
        ) : null}

        {activeSection === "injuries" && userId && role === "atleet" ? (
          <BodyAreaDiagram athleteId={userId} />
        ) : null}

        {activeSection === "goals" && userId && role === "atleet" ? (
          <AthleteGoalsSection athleteId={userId} />
        ) : null}

        {activeSection === "preferences" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-app-text">Voorkeuren</h2>
            <p className="text-sm text-app-muted">Thema en weergave-instellingen.</p>
            <ThemeToggle />
          </div>
        )}
      </ProfileSettingsLayout>

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
    <Suspense fallback={<AppShell contentClassName="flex-1 p-6">Profiel laden...</AppShell>}>
      <ProfilePageContent />
    </Suspense>
  );
}
