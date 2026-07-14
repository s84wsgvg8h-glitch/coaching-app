"use client";

import { useEffect, useState } from "react";
import { Bell, Flag, Mail, Settings, Wrench } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";
import {
  DEFAULT_EMAIL_TEMPLATE_KEYS,
  DEFAULT_FEATURE_FLAG_KEYS,
  type AppSettings,
  type EmailTemplates,
  type FeatureFlags,
  type SystemBannerRow,
} from "@/lib/adminSettings";
import { AdminPageHeader } from "@/components/admin/AdminPageParts";
import { AdminLoading, AdminPanel, AdminPanelHeader } from "@/components/admin/AdminUi";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type AdminSettingsTabProps = {
  onToast?: (message: string) => void;
};

type SettingsSection = "maintenance" | "flags" | "banners" | "email";

const SECTIONS: Array<{
  id: SettingsSection;
  label: string;
  icon: typeof Settings;
}> = [
  { id: "maintenance", label: "Onderhoud & welkom", icon: Wrench },
  { id: "flags", label: "Feature flags", icon: Flag },
  { id: "banners", label: "Systeemnotificaties", icon: Bell },
  { id: "email", label: "Overig", icon: Mail },
];

const MAINTENANCE_MAX = 500;
const WELCOME_MAX = 300;

function AdminToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="admin-toggle-row">
      <div className="min-w-0">
        <p className="admin-strong text-[13px]">{label}</p>
        {description ? (
          <p className="admin-muted text-[12px]">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`admin-toggle ${checked ? "is-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="admin-toggle-knob" />
      </button>
    </div>
  );
}

function CharCounter({
  value,
  max,
}: {
  value: string;
  max: number;
}) {
  const count = value.length;
  const nearLimit = count > max * 0.85;
  return (
    <p
      className={`mt-1 text-right text-[11px] ${nearLimit ? "text-amber-400" : "text-app-subtle"}`}
    >
      {count}/{max}
    </p>
  );
}

export default function AdminSettingsTab({ onToast }: AdminSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("maintenance");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<AppSettings | null>(null);
  const [banners, setBanners] = useState<SystemBannerRow[]>([]);
  const [newBanner, setNewBanner] = useState({
    message: "",
    banner_type: "info" as SystemBannerRow["banner_type"],
    active: true,
  });

  async function load() {
    setLoading(true);
    const result = await adminFetch<{
      settings: AppSettings | null;
      banners: SystemBannerRow[];
    }>("/api/admin/settings");

    if (result.data) {
      const loaded =
        result.data.settings || {
          id: 1,
          maintenance_mode: false,
          maintenance_message: null,
          welcome_message: null,
          feature_flags: {},
          email_templates: {},
          updated_at: new Date().toISOString(),
          updated_by: null,
        };
      setSettings(loaded);
      setSavedSnapshot(loaded);
      setBanners(result.data.banners);
      setDirty(false);
    } else if (result.error) {
      onToast?.(result.error);
    }

    setLoading(false);
  }

  useEffect(() => {
    deferEffectUpdate(() => {
      void load();
    });
  }, []);

  function patchSettings(next: AppSettings) {
    setSettings(next);
    setDirty(true);
  }

  function cancelChanges() {
    if (savedSnapshot) {
      setSettings(savedSnapshot);
      setDirty(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);

    const result = await adminFetch("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ settings }),
    });

    setSaving(false);

    if (result.error) {
      onToast?.(result.error);
      return;
    }

    onToast?.("Instellingen opgeslagen.");
    setDirty(false);
    void load();
  }

  async function addBanner() {
    if (!newBanner.message.trim()) return;

    const result = await adminFetch("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ createBanner: newBanner }),
    });

    if (result.error) {
      onToast?.(result.error);
      return;
    }

    setNewBanner({ message: "", banner_type: "info", active: true });
    onToast?.("Banner toegevoegd.");
    void load();
  }

  async function toggleBanner(banner: SystemBannerRow) {
    const result = await adminFetch("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({
        banner: { id: banner.id, active: !banner.active },
      }),
    });

    if (result.error) onToast?.(result.error);
    else void load();
  }

  async function removeBanner(id: string) {
    if (!window.confirm("Banner verwijderen?")) return;

    const result = await adminFetch("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ deleteBannerId: id }),
    });

    if (result.error) onToast?.(result.error);
    else void load();
  }

  function updateFlag(key: string, value: boolean) {
    if (!settings) return;
    patchSettings({
      ...settings,
      feature_flags: { ...settings.feature_flags, [key]: value },
    });
  }

  function updateEmailTemplate(
    key: string,
    field: "subject" | "body",
    value: string,
  ) {
    if (!settings) return;
    const templates = { ...settings.email_templates } as EmailTemplates;
    const current = templates[key] || { subject: "", body: "" };
    templates[key] = { ...current, [field]: value };
    patchSettings({ ...settings, email_templates: templates });
  }

  const bannerTypeLabels: Record<SystemBannerRow["banner_type"], string> = {
    info: "Info",
    warning: "Waarschuwing",
    success: "Succes",
    error: "Fout",
  };

  if (loading || !settings) {
    return <AdminLoading label="Instellingen laden…" />;
  }

  return (
    <div className="admin-tab-page pb-24">
      <AdminPageHeader
        title="Instellingen"
        subtitle="Platformconfiguratie, feature flags, onderhoudsmodus en systeemnotificaties."
        icon={Settings}
      />

      <nav className="admin-settings-tabs" aria-label="Instellingen secties">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            className={`admin-settings-tab ${activeSection === id ? "is-active" : ""}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {activeSection === "maintenance" ? (
        <AdminPanel>
          <AdminPanelHeader
            title="Onderhoud & welkom"
            description="Onderhoudsmodus blokkeert toegang voor niet-admins. Welkomsttekst verschijnt op het dashboard."
          />
          <div className="mt-4 space-y-5">
            <AdminToggle
              checked={settings.maintenance_mode}
              onChange={(value) =>
                patchSettings({ ...settings, maintenance_mode: value })
              }
              label="Onderhoudsmodus"
              description="Alleen admins hebben toegang tot het platform."
            />
            <label className="admin-field !mt-0 block">
              <span className="admin-label">Onderhoudsbericht</span>
              <textarea
                value={settings.maintenance_message || ""}
                onChange={(event) =>
                  patchSettings({
                    ...settings,
                    maintenance_message: event.target.value.slice(
                      0,
                      MAINTENANCE_MAX,
                    ),
                  })
                }
                rows={3}
                maxLength={MAINTENANCE_MAX}
                className="admin-textarea mt-1"
                placeholder="Bericht dat gebruikers zien tijdens onderhoud…"
              />
              <CharCounter
                value={settings.maintenance_message || ""}
                max={MAINTENANCE_MAX}
              />
            </label>
            <label className="admin-field !mt-0 block">
              <span className="admin-label">Welkomsttekst (dashboard)</span>
              <textarea
                value={settings.welcome_message || ""}
                onChange={(event) =>
                  patchSettings({
                    ...settings,
                    welcome_message: event.target.value.slice(0, WELCOME_MAX),
                  })
                }
                rows={3}
                maxLength={WELCOME_MAX}
                className="admin-textarea mt-1"
                placeholder="Optionele welkomsttekst op het dashboard…"
              />
              <CharCounter
                value={settings.welcome_message || ""}
                max={WELCOME_MAX}
              />
            </label>
          </div>
        </AdminPanel>
      ) : null}

      {activeSection === "flags" ? (
        <AdminPanel>
          <AdminPanelHeader
            title="Feature flags"
            description="Schakel platformfuncties in of uit voor alle gebruikers."
          />
          <div className="admin-feature-grid mt-4">
            {DEFAULT_FEATURE_FLAG_KEYS.map((flag) => (
              <div key={flag.key} className="admin-feature-item">
                <div className="min-w-0">
                  <p className="admin-strong text-[13px]">{flag.label}</p>
                  <p className="admin-subtle text-[11px]">{flag.key}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(
                    (settings.feature_flags as FeatureFlags)[flag.key],
                  )}
                  aria-label={flag.label}
                  className={`admin-toggle ${
                    (settings.feature_flags as FeatureFlags)[flag.key]
                      ? "is-on"
                      : ""
                  }`}
                  onClick={() =>
                    updateFlag(
                      flag.key,
                      !(settings.feature_flags as FeatureFlags)[flag.key],
                    )
                  }
                >
                  <span className="admin-toggle-knob" />
                </button>
              </div>
            ))}
          </div>
        </AdminPanel>
      ) : null}

      {activeSection === "banners" ? (
        <AdminPanel>
          <AdminPanelHeader
            title="Systeemnotificaties"
            description="Bannerberichten zichtbaar voor alle ingelogde gebruikers."
          />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <select
              value={newBanner.banner_type}
              onChange={(event) =>
                setNewBanner((current) => ({
                  ...current,
                  banner_type: event.target
                    .value as SystemBannerRow["banner_type"],
                }))
              }
              className="admin-select sm:min-w-[160px]"
            >
              <option value="info">Info</option>
              <option value="warning">Waarschuwing</option>
              <option value="success">Succes</option>
              <option value="error">Fout</option>
            </select>
            <input
              value={newBanner.message}
              onChange={(event) =>
                setNewBanner((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              placeholder="Bannerbericht"
              className="admin-input min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={() => void addBanner()}
              className="admin-btn admin-btn--primary w-full sm:w-auto"
            >
              + Banner toevoegen
            </button>
          </div>

          {banners.length === 0 ? (
            <p className="admin-empty">Geen banners aangemaakt.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className="admin-card flex flex-col gap-2 text-[13px] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="admin-strong">{banner.message}</p>
                    <p className="admin-muted">
                      {bannerTypeLabels[banner.banner_type]} ·{" "}
                      <span
                        className={
                          banner.active
                            ? "admin-badge admin-badge--success"
                            : "admin-badge"
                        }
                      >
                        {banner.active ? "Actief" : "Inactief"}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleBanner(banner)}
                      className="admin-btn admin-btn--ghost admin-btn--sm"
                    >
                      {banner.active ? "Deactiveer" : "Activeer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeBanner(banner.id)}
                      className="admin-btn admin-btn--danger admin-btn--sm"
                    >
                      Verwijder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      ) : null}

      {activeSection === "email" ? (
        <AdminPanel>
          <AdminPanelHeader
            title="E-mailtemplates"
            description={`${DEFAULT_EMAIL_TEMPLATE_KEYS.length} templates voor toekomstige notificaties.`}
          />
          <div className="mt-4 space-y-3">
            {DEFAULT_EMAIL_TEMPLATE_KEYS.map((tpl) => (
              <div key={tpl.key} className="admin-card">
                <p className="admin-strong">{tpl.label}</p>
                <input
                  value={settings.email_templates[tpl.key]?.subject || ""}
                  onChange={(event) =>
                    updateEmailTemplate(tpl.key, "subject", event.target.value)
                  }
                  placeholder="Onderwerp"
                  className="admin-input mt-2"
                />
                <textarea
                  value={settings.email_templates[tpl.key]?.body || ""}
                  onChange={(event) =>
                    updateEmailTemplate(tpl.key, "body", event.target.value)
                  }
                  rows={4}
                  placeholder="Inhoud"
                  className="admin-textarea mt-2"
                />
              </div>
            ))}
          </div>
        </AdminPanel>
      ) : null}

      {dirty ? (
        <div className="admin-save-bar">
          <p className="text-[13px] text-app-muted">
            Niet-opgeslagen wijzigingen
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cancelChanges}
              disabled={saving}
              className="admin-btn admin-btn--ghost"
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={saving}
              className="admin-btn admin-btn--primary"
            >
              {saving ? "Opslaan…" : "Opslaan"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
