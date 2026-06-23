"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import AdminAppShell from "@/components/admin/AdminAppShell";
import { AdminPanel } from "@/components/admin/AdminUi";
import { PageContainer } from "@/components/ui/design-system";
import { supabase } from "@/lib/supabaseClient";
import "@/styles/admin.css";

export default function AdminCreateCoachPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.title = "Coach aanmaken";

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        window.location.href = "/dashboard";
        return;
      }

      setLoading(false);
    }

    void init();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setMessage("Sessie verlopen. Log opnieuw in.");
      setSaving(false);
      return;
    }

    const response = await fetch("/api/admin/create-coach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email, password, fullName }),
    });

    const payload = (await response.json()) as {
      error?: string;
      ok?: boolean;
    };

    setSaving(false);

    if (!response.ok) {
      setMessage(payload.error || "Coach aanmaken mislukt.");
      return;
    }

    setMessage("Coach-account aangemaakt.");
    setFullName("");
    setEmail("");
    setPassword("");
  }

  return (
    <div className="admin-page-root min-h-[100dvh] bg-app-bg">
      <AdminAppShell activeTab="overview">
        <PageContainer size="md" className="admin-tab-page">
        <Link
          href="/admin?tab=overview"
          className="admin-btn admin-btn--ghost mb-4 inline-flex"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar admin
        </Link>

        <header className="admin-page-header">
          <div>
            <p className="admin-header-eyebrow">Platformbeheer</p>
            <h1 className="admin-page-title">Coach aanmaken</h1>
            <p className="admin-page-subtitle">
              Maak direct een coach-account aan met e-mail en wachtwoord.
            </p>
          </div>
        </header>

        {loading ? (
          <p className="admin-muted text-[13px]">Laden…</p>
        ) : (
          <AdminPanel>
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <label className="admin-field block">
                <span className="admin-label">Volledige naam</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  className="admin-input mt-1.5"
                  autoComplete="name"
                />
              </label>
              <label className="admin-field block">
                <span className="admin-label">E-mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="admin-input mt-1.5"
                  autoComplete="email"
                />
              </label>
              <label className="admin-field block">
                <span className="admin-label">Tijdelijk wachtwoord</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="admin-input mt-1.5"
                  autoComplete="new-password"
                />
              </label>
              {message ? (
                <p
                  className={`text-[13px] ${
                    message.includes("aangemaakt")
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {message}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={saving}
                className="admin-btn admin-btn--primary w-full sm:w-auto"
              >
                {saving ? "Bezig…" : "Coach aanmaken"}
              </button>
            </form>
          </AdminPanel>
        )}
        </PageContainer>
      </AdminAppShell>
    </div>
  );
}
