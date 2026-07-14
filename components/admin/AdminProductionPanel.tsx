"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Copy, ExternalLink, Loader2, Zap } from "lucide-react";
import { getAppUrl, getAuthRedirectUrls } from "@/lib/appUrl";
import { adminFetch } from "@/lib/adminFetch";
import { AdminPanel } from "@/components/admin/AdminUi";

type EnvCheck = {
  key: string;
  label: string;
  required: boolean;
};

const ENV_CHECKS: EnvCheck[] = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL", required: true },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase anon key", required: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Service role", required: true },
  { key: "NEXT_PUBLIC_APP_URL", label: "App URL (productiedomein)", required: true },
  { key: "CRON_SECRET", label: "Cron secret", required: true },
  { key: "STRIPE_SECRET_KEY", label: "Stripe secret", required: false },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe webhook", required: false },
  { key: "RESEND_API_KEY", label: "Resend e-mail", required: false },
  { key: "OPENAI_API_KEY", label: "OpenAI", required: false },
  { key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", label: "VAPID public", required: false },
  { key: "APPLE_TEAM_ID", label: "Apple Team ID (Universal Links)", required: false },
  { key: "APNS_KEY_ID", label: "APNs Key ID", required: false },
  { key: "APNS_TEAM_ID", label: "APNs Team ID", required: false },
  { key: "APNS_PRIVATE_KEY", label: "APNs private key (.p8)", required: false },
  { key: "SUPABASE_ACCESS_TOKEN", label: "Supabase access token (auth config)", required: false },
];

export default function AdminProductionPanel() {
  const [copied, setCopied] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [health, setHealth] = useState<{
    cronSecretPresent?: boolean;
  } | null>(null);
  const appUrl = getAppUrl();
  const redirectUrls = getAuthRedirectUrls();

  useEffect(() => {
    void adminFetch<{ checks: { cronSecretPresent: boolean } }>(
      "/api/admin/health",
    ).then((result) => {
      if (result.data) setHealth(result.data.checks);
    });
  }, [configMessage]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
  }

  async function configureSupabaseAuth() {
    setConfiguring(true);
    setConfigMessage(null);
    const result = await adminFetch<{ ok?: boolean; error?: string; site_url?: string }>(
      "/api/admin/configure-auth",
      { method: "POST", body: JSON.stringify({ siteUrl: appUrl }) },
    );
    setConfiguring(false);
    if (result.error) {
      setConfigMessage(result.error);
      return;
    }
    setConfigMessage(`Auth geconfigureerd voor ${result.data?.site_url || appUrl}`);
  }

  return (
    <AdminPanel>
      <h2 className="admin-panel-title">Productie-checklist</h2>
      <p className="admin-muted mt-1 max-w-2xl text-[13px] leading-relaxed">
        Stel deze items in vóór launch. Env-vars in Vercel · Auth in Supabase
        Dashboard.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ENV_CHECKS.map((item) => {
          const liveOk =
            item.key === "CRON_SECRET" ? health?.cronSecretPresent : undefined;
          return (
          <div key={item.key} className="flex items-center gap-2 rounded-lg border border-white/8 px-3 py-2">
            {liveOk === true ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            ) : liveOk === false ? (
              <Circle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-app-subtle" />
            )}
            <span className="text-[13px] text-app-text">
              {item.label}
              {!item.required ? (
                <span className="text-app-subtle"> (optioneel)</span>
              ) : null}
            </span>
          </div>
        );
        })}
      </div>

      <div className="mt-6 space-y-4 rounded-xl border border-white/8 bg-black/20 p-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-app-subtle">
            Site URL (Supabase Auth)
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all rounded-lg bg-black/30 px-2 py-1 text-[13px] text-sky-200">
              {appUrl}
            </code>
            <button
              type="button"
              onClick={() => void copyText("site", appUrl)}
              className="admin-btn admin-btn--ghost admin-btn--sm"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied === "site" ? "Gekopieerd" : "Kopieer"}
            </button>
          </div>
        </div>

        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-app-subtle">
            Redirect URLs
          </p>
          <ul className="mt-2 space-y-1">
            {redirectUrls.map((url) => (
              <li key={url}>
                <code className="text-[12px] text-app-muted">{url}</code>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void copyText("redirects", redirectUrls.join("\n"))}
            className="admin-btn admin-btn--ghost admin-btn--sm mt-2"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied === "redirects" ? "Gekopieerd" : "Kopieer alle URLs"}
          </button>
        </div>

        <ul className="space-y-2 text-[13px] text-app-muted">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            E-mailbevestiging inschakelen (Auth → Providers → Email)
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            Leaked password protection aanzetten
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            Wachtwoord-reset template controleren
          </li>
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => void configureSupabaseAuth()}
            disabled={configuring}
            className="admin-btn admin-btn--primary inline-flex w-full min-h-[44px] sm:w-auto"
          >
            {configuring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Supabase Auth automatisch configureren
          </button>
          <a
            href="https://supabase.com/dashboard/project/dgryvmvfwyixscidmzrc/auth/url-configuration"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn--ghost inline-flex w-full min-h-[44px] sm:w-auto"
          >
            <ExternalLink className="h-4 w-4" />
            Handmatig in dashboard
          </a>
        </div>
        {configMessage ? (
          <p className="text-[13px] text-app-muted">{configMessage}</p>
        ) : null}
        <p className="text-[12px] text-app-subtle">
          Automatisch vereist <code>SUPABASE_ACCESS_TOKEN</code> in Vercel (account
          token van supabase.com/dashboard/account/tokens).
        </p>
      </div>
    </AdminPanel>
  );
}
