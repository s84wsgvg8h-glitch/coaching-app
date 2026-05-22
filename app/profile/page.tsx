"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import AthleteProfileSection from "@/components/AthleteProfileSection";
import BodyAreaDiagram from "@/components/BodyAreaDiagram";
import ChatAvatar from "@/components/chat/ChatAvatar";
import { updateProfileAvatar, uploadAvatar } from "@/lib/chatAvatars";

export default function ProfilePage() {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [geboortedatum, setGeboortedatum] = useState("");
  const [lidnummer, setLidnummer] = useState("");

  const [editedFullName, setEditedFullName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedPassword, setEditedPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
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
  }, [editedFullName, editedEmail, profileLoaded, userId]);

  useEffect(() => {
    return () => {
      if (saveMessageTimer.current) {
        window.clearTimeout(saveMessageTimer.current);
      }
    };
  }, []);

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

    setSaving(true);
    const { url, error } = await uploadAvatar(userId, file, "profile");

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

  return (
    <AppShell contentClassName="flex-1 p-6 space-y-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-3xl">
        <h2 className="text-3xl font-bold mb-2">Profiel aanpassen</h2>
        <p className="text-gray-500 mb-8">Pas hier je persoonlijke gegevens aan.</p>

        <div className="mb-8 flex items-center gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-2">Volledige naam</label>
            <input type="text" value={editedFullName} onChange={(e) => setEditedFullName(e.target.value)} className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input type="email" value={editedEmail} onChange={(e) => setEditedEmail(e.target.value)} className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Nieuw wachtwoord</label>
            <input type="password" value={editedPassword} onChange={(e) => setEditedPassword(e.target.value)} onBlur={() => void savePasswordOnBlur()} placeholder="Laat leeg als je niks wilt wijzigen" className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Rol</label>
            <div className="w-full bg-gray-100 rounded-2xl px-4 py-3 text-gray-600 capitalize">{role}</div>
          </div>
        </div>

        <div className="mt-8 flex min-h-6 items-center gap-3 text-sm text-gray-500">
          {saving ? <span>Opslaan...</span> : null}
          {message ? <span>{message}</span> : null}
          {!saving && !message ? (
            <span>Wijzigingen worden automatisch opgeslagen</span>
          ) : null}
        </div>
      </div>

      {userId && (
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-3xl">
          <AthleteProfileSection
            athleteId={userId}
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
        </div>
      )}

      <BodyAreaDiagram athleteId={userId} />
    </AppShell>
  );
}
