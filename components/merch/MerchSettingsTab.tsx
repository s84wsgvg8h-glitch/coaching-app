"use client";

import { useEffect, useState } from "react";
import { CreditCard, Package, Truck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  loadMerchShopSettings,
  loadMerchShopSettingsAsync,
  saveMerchShopSettingsAsync,
  type MerchShopSettings,
} from "@/lib/merchShopConfig";

type MerchSettingsTabProps = {
  userId: string;
  onToast: (message: string) => void;
};

type StripeStatus = {
  connected: boolean;
  loading: boolean;
  accountId?: string;
};

export default function MerchSettingsTab({
  userId,
  onToast,
}: MerchSettingsTabProps) {
  const [settings, setSettings] = useState<MerchShopSettings>(
    loadMerchShopSettings(userId),
  );
  const [stripe, setStripe] = useState<StripeStatus>({
    connected: false,
    loading: true,
  });

  useEffect(() => {
    void loadMerchShopSettingsAsync(userId).then(setSettings);
  }, [userId]);

  useEffect(() => {
    async function loadStripe() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setStripe({ connected: false, loading: false });
          return;
        }
        const response = await fetch("/api/stripe/connect", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          setStripe({ connected: false, loading: false });
          return;
        }
        const data = (await response.json()) as {
          connected?: boolean;
          accountId?: string;
        };
        setStripe({
          connected: Boolean(data.connected),
          loading: false,
          accountId: data.accountId,
        });
      } catch {
        setStripe({ connected: false, loading: false });
      }
    }
    void loadStripe();
  }, []);

  async function handleStripeConnect() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      onToast("Kon geen sessie vinden.");
      return;
    }
    const response = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const data = (await response.json()) as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    onToast(data.error || "Stripe koppeling mislukt.");
  }

  async function updateSettings(patch: Partial<MerchShopSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    const error = await saveMerchShopSettingsAsync(userId, next);
    if (error) {
      onToast(error.message || "Opslaan mislukt.");
      return;
    }
    onToast("Instellingen opgeslagen.");
  }

  return (
    <>
      <header className="mb-5">
        <h1 className="text-[28px] font-bold tracking-tight text-app-text">
          Instellingen
        </h1>
        <p className="mt-1 text-[14px] text-app-muted">
          Shopinstellingen, betalingen en verzending.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsCard
          icon={CreditCard}
          title="Stripe Connect"
          description="Koppel je Stripe-account om betalingen te ontvangen."
        >
          {stripe.loading ? (
            <p className="text-[13px] text-app-muted">Status laden...</p>
          ) : (
            <>
              <p
                className={`text-[13px] font-semibold ${
                  stripe.connected ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {stripe.connected ? "Verbonden" : "Niet verbonden"}
              </p>
              {stripe.accountId ? (
                <p className="mt-1 text-[11px] text-app-muted">
                  Account: {stripe.accountId}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void handleStripeConnect()}
                className="app-btn-primary mt-3"
              >
                {stripe.connected ? "Stripe beheren" : "Stripe koppelen"}
              </button>
            </>
          )}
        </SettingsCard>

        <SettingsCard
          icon={Truck}
          title="Verzendopties"
          description="Standaard verzendkosten en ophalen bij training."
        >
          <label className="flex items-center justify-between gap-3 text-[13px] text-app-text">
            <span>Ophalen bij training</span>
            <input
              type="checkbox"
              checked={settings.pickupAtTraining}
              onChange={(e) =>
                updateSettings({ pickupAtTraining: e.target.checked })
              }
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[12px] text-app-muted">
              Standaard verzendkosten (cent)
            </span>
            <input
              type="number"
              value={settings.defaultShippingCents}
              onChange={(e) =>
                updateSettings({
                  defaultShippingCents: Number(e.target.value) || 0,
                })
              }
              className="ui-auth-input mt-1 w-full"
            />
          </label>
        </SettingsCard>

        <SettingsCard
          icon={Package}
          title="Shop beleid"
          description="Retourbeleid en valuta."
        >
          <label className="block">
            <span className="text-[12px] text-app-muted">Retourbeleid</span>
            <textarea
              value={settings.returnPolicy}
              onChange={(e) =>
                updateSettings({ returnPolicy: e.target.value })
              }
              rows={3}
              className="ui-auth-input mt-1 w-full"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[12px] text-app-muted">Valuta</span>
            <select
              value={settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value })}
              className="ui-auth-input mt-1 w-full"
            >
              <option value="EUR">EUR (€)</option>
            </select>
          </label>
        </SettingsCard>

        <SettingsCard
          icon={Package}
          title="Notificaties"
          description="Meldingen bij voorraad en nieuwe orders."
        >
          <label className="flex items-center justify-between gap-3 text-[13px] text-app-text">
            <span>Voorraadmeldingen</span>
            <input
              type="checkbox"
              checked={settings.stockAlerts}
              onChange={(e) =>
                updateSettings({ stockAlerts: e.target.checked })
              }
            />
          </label>
          <label className="mt-3 flex items-center justify-between gap-3 text-[13px] text-app-text">
            <span>Nieuwe order notificaties</span>
            <input
              type="checkbox"
              checked={settings.newOrderNotifications}
              onChange={(e) =>
                updateSettings({ newOrderNotifications: e.target.checked })
              }
            />
          </label>
        </SettingsCard>
      </div>
    </>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof CreditCard;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10">
          <Icon className="h-5 w-5 text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-app-text">{title}</h2>
          <p className="mt-0.5 text-[12px] text-app-muted">{description}</p>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
