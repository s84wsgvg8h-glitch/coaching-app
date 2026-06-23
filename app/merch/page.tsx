"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import MerchCoachHub from "@/components/merch/MerchCoachHub";
import MerchAthleteShop from "@/components/merch/athlete/MerchAthleteShop";
import { PageLoading } from "@/components/ui/Skeleton";
import Toast, { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabaseClient";
import { isAthleteRole, isCoachLikeRole } from "@/lib/authRoles";
import {
  deleteMerchItem,
  loadMerchItems,
  toggleMerchItemActive,
  type MerchItem,
} from "@/lib/merch";
import {
  loadAthleteMerchOrders,
  loadCoachMerchOrders,
  type AthleteMerchOrderRow,
  type CoachMerchOrderRow,
} from "@/lib/merchOrders";

export default function MerchPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageLoading label="Merch laden…" />
        </AppShell>
      }
    >
      <MerchPageContent />
    </Suspense>
  );
}

function MerchPageContent() {
  const searchParams = useSearchParams();
  const { message: toastMessage, showToast, clearToast } = useToast();
  const [userId, setUserId] = useState("");
  const [coachId, setCoachId] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [items, setItems] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [orders, setOrders] = useState<CoachMerchOrderRow[]>([]);
  const [athleteOrders, setAthleteOrders] = useState<AthleteMerchOrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [athleteCount, setAthleteCount] = useState(0);

  useEffect(() => {
    document.title = "Merch";
  }, []);

  useEffect(() => {
    const successId = searchParams.get("success");
    if (successId) {
      showToast(
        "Bedankt! Je betaling wordt verwerkt. De status wordt zo bijgewerkt.",
      );
      window.setTimeout(() => {
        void refreshAthleteOrders();
      }, 3000);
    } else if (searchParams.get("cancelled")) {
      showToast("Betaling geannuleerd.");
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, coach_id")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role || "";
      setRole(userRole);
      setCoachId((profile?.coach_id as string | null) ?? null);
      setItems(await loadMerchItems(isCoachLikeRole(userRole)));

      if (isCoachLikeRole(userRole)) {
        setOrdersLoading(true);
        const [coachOrders, athletes] = await Promise.all([
          loadCoachMerchOrders(),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "atleet"),
        ]);
        setOrders(coachOrders);
        setAthleteCount(athletes.count || 0);
        setOrdersLoading(false);
      }

      if (isAthleteRole(userRole)) {
        setOrdersLoading(true);
        setAthleteOrders(await loadAthleteMerchOrders(user.id));
        setOrdersLoading(false);
      }

      setLoading(false);
    }

    void load();
  }, []);

  async function refreshAthleteOrders() {
    if (!userId) return;
    setAthleteOrders(await loadAthleteMerchOrders(userId));
  }

  async function refresh() {
    setItems(await loadMerchItems(isCoachLikeRole(role)));
    if (isCoachLikeRole(role)) {
      setOrders(await loadCoachMerchOrders());
    }
    if (isAthleteRole(role)) {
      await refreshAthleteOrders();
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Dit merch item verwijderen?")) return;

    const { error } = await deleteMerchItem(id);
    if (error) {
      showToast(error.message);
      return;
    }

    await refresh();
    showToast("Product verwijderd.");
  }

  async function handleToggleLive(item: MerchItem) {
    setTogglingId(item.id);
    const nextActive = !item.active;
    const { error } = await toggleMerchItemActive(item.id, nextActive);
    setTogglingId(null);

    if (error) {
      showToast(error.message);
      return;
    }

    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, active: nextActive } : entry,
      ),
    );
    showToast(nextActive ? "Product staat live." : "Product staat op concept.");
  }

  const isCoach = isCoachLikeRole(role);
  const isAthlete = isAthleteRole(role);

  return (
    <AppShell contentClassName="app-page-content flex-1 p-4 md:p-8">
      <Toast message={toastMessage} onDismiss={clearToast} />

      {loading ? (
        <div className="mx-auto w-full max-w-[1500px]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-2xl border border-app-border/60 bg-app-surface/30"
              />
            ))}
          </div>
        </div>
      ) : isCoach ? (
        <MerchCoachHub
          userId={userId}
          items={items}
          orders={orders}
          ordersLoading={ordersLoading}
          athleteCount={athleteCount}
          onRefresh={refresh}
          onToggleLive={handleToggleLive}
          onDelete={handleDelete}
          onToast={showToast}
          togglingId={togglingId}
        />
      ) : isAthlete ? (
        <MerchAthleteShop
          items={items}
          orders={athleteOrders}
          ordersLoading={ordersLoading}
          coachId={coachId}
        />
      ) : (
        <div className="app-card text-app-muted">
          Geen toegang tot merch.
        </div>
      )}
    </AppShell>
  );
}
