"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import { supabase } from "@/lib/supabaseClient";
import StatisticsView from "@/components/StatisticsView";
import RawDataView from "@/components/RawDataView";

type DataTab = "statistieken" | "ruwe-data";

function DataPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const embeddedInChat = searchParams.get("embedded") === "chat";
  const tabParam = searchParams.get("tab");
  const [role, setRole] = useState("");
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    document.title = "Data & voortgang";

    async function loadRole() {
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

      setRole(profile?.role || "");
      setLoadingRole(false);
    }

    void loadRole();
  }, []);

  const isCoach = role === "coach" || role === "admin";
  const activeTab: DataTab =
    tabParam === "ruwe-data" && isCoach
      ? "ruwe-data"
      : "statistieken";

  function switchTab(tab: DataTab) {
    router.replace(`/data?tab=${tab}`, { scroll: false });
  }

  if (embeddedInChat) {
    return (
      <main className="min-h-full bg-gray-100">
        <RawDataView embeddedInUnifiedPage />
      </main>
    );
  }

  if (loadingRole) {
    return (
      <main className="min-h-[100dvh] bg-gray-100">
        <section className="flex-1 p-8 pb-24">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow">
            Data laden...
          </div>
        </section>
        <AppSidebar />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-gray-100">
      <section className="flex-1 p-8 pb-24">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black">
            {isCoach ? "Data & statistieken" : "Voortgang"}
          </h1>
          <p className="mt-2 text-gray-500">
            {isCoach
              ? "Bekijk grafieken, trends en ruwe trainingslogs op één plek."
              : "Bekijk je statistieken en voortgang."}
          </p>
        </div>

        {isCoach ? (
          <div className="mb-6 inline-flex rounded-xl bg-white p-1 shadow">
            <button
              type="button"
              onClick={() => switchTab("statistieken")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                activeTab === "statistieken"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Statistieken
            </button>
            <button
              type="button"
              onClick={() => switchTab("ruwe-data")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                activeTab === "ruwe-data"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Ruwe data
            </button>
          </div>
        ) : null}

        {activeTab === "statistieken" ? (
          <StatisticsView embedded />
        ) : (
          <RawDataView embeddedInUnifiedPage />
        )}
      </section>
      <AppSidebar />
    </main>
  );
}

export default function DataPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-gray-100">
          <section className="flex-1 p-8 pb-24">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow">
              Data laden...
            </div>
          </section>
        </main>
      }
    >
      <DataPageInner />
    </Suspense>
  );
}
