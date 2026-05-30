"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import {
  DEFAULT_EMAIL_TEMPLATE_KEYS,
  DEFAULT_FEATURE_FLAG_KEYS,
  type AppSettings,
  type EmailTemplates,
  type FeatureFlags,
  type SystemBannerRow,
} from "@/lib/adminSettings";

export default function AdminSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
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
      setSettings(
        result.data.settings || {
          id: 1,
          maintenance_mode: false,
          maintenance_message: null,
          welcome_message: null,
          feature_flags: {},
          email_templates: {},
          updated_at: new Date().toISOString(),
          updated_by: null,
        },
      );
      setBanners(result.data.banners);
    } else if (result.error) {
      alert(result.error);
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);

    const result = await adminFetch("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ settings }),
    });

    setSaving(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    alert("Instellingen opgeslagen.");
    void load();
  }

  async function addBanner() {
    if (!newBanner.message.trim()) return;

    const result = await adminFetch("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ createBanner: newBanner }),
    });

    if (result.error) {
      alert(result.error);
      return;
    }

    setNewBanner({ message: "", banner_type: "info", active: true });
    void load();
  }

  async function toggleBanner(banner: SystemBannerRow) {
    const result = await adminFetch("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({
        banner: { id: banner.id, active: !banner.active },
      }),
    });

    if (result.error) alert(result.error);
    else void load();
  }

  async function removeBanner(id: string) {
    const result = await adminFetch("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ deleteBannerId: id }),
    });

    if (result.error) alert(result.error);
    else void load();
  }

  function updateFlag(key: string, value: boolean) {
    if (!settings) return;
    setSettings({
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
    setSettings({ ...settings, email_templates: templates });
  }

  if (loading || !settings) {
    return <p className="text-sm text-gray-500">Instellingen laden...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Onderhoud & welkom</h2>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.maintenance_mode}
            onChange={(event) =>
              setSettings({
                ...settings,
                maintenance_mode: event.target.checked,
              })
            }
          />
          Onderhoudsmodus (alleen admins hebben toegang)
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-gray-500">Onderhoudsbericht</span>
          <textarea
            value={settings.maintenance_message || ""}
            onChange={(event) =>
              setSettings({
                ...settings,
                maintenance_message: event.target.value,
              })
            }
            rows={2}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-gray-500">Welkomsttekst (dashboard)</span>
          <textarea
            value={settings.welcome_message || ""}
            onChange={(event) =>
              setSettings({
                ...settings,
                welcome_message: event.target.value,
              })
            }
            rows={2}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
          />
        </label>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Feature flags</h2>
        <div className="mt-3 space-y-2">
          {DEFAULT_FEATURE_FLAG_KEYS.map((flag) => (
            <label key={flag.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(
                  (settings.feature_flags as FeatureFlags)[flag.key],
                )}
                onChange={(event) => updateFlag(flag.key, event.target.checked)}
              />
              {flag.label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">E-mailtemplates</h2>
        <p className="text-sm text-gray-500">
          Opgeslagen in app_settings voor toekomstige notificaties.
        </p>
        {DEFAULT_EMAIL_TEMPLATE_KEYS.map((tpl) => (
          <div key={tpl.key} className="mt-4 rounded-xl border border-gray-200 p-3">
            <p className="font-semibold text-black">{tpl.label}</p>
            <input
              value={settings.email_templates[tpl.key]?.subject || ""}
              onChange={(event) =>
                updateEmailTemplate(tpl.key, "subject", event.target.value)
              }
              placeholder="Onderwerp"
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              value={settings.email_templates[tpl.key]?.body || ""}
              onChange={(event) =>
                updateEmailTemplate(tpl.key, "body", event.target.value)
              }
              rows={3}
              placeholder="Inhoud"
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Systeemnotificaties</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={newBanner.message}
            onChange={(event) =>
              setNewBanner((current) => ({
                ...current,
                message: event.target.value,
              }))
            }
            placeholder="Bannerbericht voor alle gebruikers"
            className="min-w-[240px] flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={newBanner.banner_type}
            onChange={(event) =>
              setNewBanner((current) => ({
                ...current,
                banner_type: event.target
                  .value as SystemBannerRow["banner_type"],
              }))
            }
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="info">Info</option>
            <option value="warning">Waarschuwing</option>
            <option value="success">Succes</option>
            <option value="error">Fout</option>
          </select>
          <button
            type="button"
            onClick={() => void addBanner()}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Banner toevoegen
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 p-3 text-sm"
            >
              <div>
                <p className="font-medium text-black">{banner.message}</p>
                <p className="text-gray-500">
                  {banner.banner_type} · {banner.active ? "actief" : "inactief"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void toggleBanner(banner)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold"
                >
                  {banner.active ? "Deactiveer" : "Activeer"}
                </button>
                <button
                  type="button"
                  onClick={() => void removeBanner(banner.id)}
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600"
                >
                  Verwijder
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => void saveSettings()}
        disabled={saving}
        className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Opslaan..." : "Alles opslaan"}
      </button>
    </div>
  );
}
