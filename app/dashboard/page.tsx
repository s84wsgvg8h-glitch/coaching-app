"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";

export default function DashboardPage() {
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
      }
    }

    getProfile();
  }, []);

  return (
    <AppShell>
      <div className="bg-white rounded-3xl shadow-xl p-10 min-h-[400px]">
        <h2 className="text-4xl font-bold mb-3">{fullName}</h2>

        <p className="text-gray-500 text-lg">
          Hover met je muis over de linkerkolom om het menu uit te klappen.
        </p>
      </div>
    </AppShell>
  );
}
