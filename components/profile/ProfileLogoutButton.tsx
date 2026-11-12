"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={loading}
      className="app-focus-ring inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-60 sm:w-auto"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {loading ? "Uitloggen..." : "Uitloggen"}
    </button>
  );
}
