"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import { useAuth } from "@/components/AuthProvider";
import { getUnreadMessageCount } from "@/lib/chatUnread";
import { loadCompetitions, getTodayDateString, isUpcomingCompetition } from "@/lib/competitions";
import {
  loadCoachDashboardFeed,
  type CoachInboxItem,
  type DashboardActivityItem,
} from "@/lib/coachDashboardFeed";
import { countCoachTodosDueToday } from "@/lib/todoDueToday";
import { loadAthleteCoachChatPreview } from "@/lib/athleteChatPreview";
import EmptyState from "@/components/ui/EmptyState";

type NotificationPanelProps = {
  open: boolean;
  onClose: () => void;
};

type NotificationFilter = "all" | "actions" | "activity" | "messages" | "checkins";

const FILTER_TABS: Array<{ id: NotificationFilter; label: string }> = [
  { id: "all", label: "Alles" },
  { id: "actions", label: "Acties" },
  { id: "activity", label: "Activiteit" },
  { id: "messages", label: "Berichten" },
  { id: "checkins", label: "Taken" },
];

export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const pathname = usePathname();
  const { role, userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [inbox, setInbox] = useState<CoachInboxItem[]>([]);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);

  useEffect(() => {
    if (!open || !userId) return;

    let cancelled = false;

    async function loadAthleteNotifications() {
      setLoading(true);
      const preview = await loadAthleteCoachChatPreview(userId);
      if (cancelled) return;

      if (preview && preview.unreadCount > 0) {
        setInbox([
          {
            id: "athlete-coach-chat",
            type: "message",
            tone: "blue",
            label: `${preview.unreadCount} ongelezen bericht${
              preview.unreadCount === 1 ? "" : "en"
            } van ${preview.coachName}`,
            subtitle: preview.previewText,
            href: `/chat?from=${encodeURIComponent(pathname || "/dashboard")}`,
            actionLabel: "Open chat",
            count: preview.unreadCount,
            priority: "medium",
          },
        ]);
      } else {
        setInbox([]);
      }

      setActivity([]);
      setLoading(false);
    }

    async function loadCoachNotifications() {
      setLoading(true);

      const isAdmin = role === "admin";
      let athleteQuery = supabase.from("profiles").select("id").eq("role", "atleet");
      if (!isAdmin) {
        athleteQuery = athleteQuery.eq("coach_id", userId);
      }

      const [
        chatUnread,
        athleteResult,
        openTodosResult,
        competitionsResult,
      ] = await Promise.all([
        getUnreadMessageCount(userId),
        athleteQuery,
        supabase
          .from("coach_todos")
          .select("due_at, completed")
          .eq("coach_id", userId)
          .eq("completed", false),
        loadCompetitions(),
      ]);

      if (cancelled) return;

      const athleteIds = (athleteResult.data || []).map((row) => row.id as string);
      const openTodos = countCoachTodosDueToday(openTodosResult.data || []);
      const today = getTodayDateString();
      const upcoming = (competitionsResult.data || []).filter((c) =>
        isUpcomingCompetition(c, today),
      ).length;

      const fullFeed = await loadCoachDashboardFeed(userId, athleteIds, {
        athleteCount: athleteIds.length,
        openCheckIns: openTodos,
        unreadMessages: chatUnread,
        upcomingCompetitions: upcoming,
      });

      if (cancelled) return;

      setInbox(fullFeed.inbox);
      setActivity(fullFeed.activity);
      setLoading(false);
    }

    if (role === "atleet") {
      void loadAthleteNotifications();
    } else if (isCoachLikeRole(role)) {
      void loadCoachNotifications();
    } else {
      setInbox([]);
      setActivity([]);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [open, pathname, role, userId]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setFilter("all");
  }, [open]);

  const filteredInbox = useMemo(() => {
    if (filter === "all" || filter === "actions") return inbox;
    if (filter === "messages") {
      return inbox.filter((item) => item.type === "message");
    }
    if (filter === "checkins") {
      return inbox.filter((item) => item.type === "checkin");
    }
    return [];
  }, [filter, inbox]);

  const filteredActivity = useMemo(() => {
    if (filter === "all" || filter === "activity") return activity;
    if (filter === "messages") {
      return activity.filter((item) => item.icon === "message");
    }
    if (filter === "checkins") {
      return activity.filter((item) => item.icon === "checkin");
    }
    return [];
  }, [activity, filter]);

  if (!open) return null;

  const iconMap: Record<DashboardActivityItem["icon"], string> = {
    checkin: "✓",
    video: "▶",
    message: "💬",
    program: "📋",
    intake: "📝",
    signup: "👤",
    approval: "✓",
  };

  const isAthlete = role === "atleet";
  const visibleFilterTabs = isAthlete
    ? FILTER_TABS.filter((tab) => tab.id === "all" || tab.id === "messages")
    : FILTER_TABS;
  const showInbox = filteredInbox.length > 0;
  const showActivity = filteredActivity.length > 0;
  const isEmpty = !loading && !showInbox && !showActivity;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[1px]"
        aria-label="Sluit notificaties"
        onClick={onClose}
      />
      <div
        className="fixed right-3 top-[4.5rem] z-[91] w-[min(420px,calc(100vw-1.5rem))] animate-scale-in overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:right-6"
        role="dialog"
        aria-modal="true"
        aria-label="Notificaties"
      >
        <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-app-text">Notificaties</h2>
            <p className="text-[12px] text-app-muted">Activiteit en open acties</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-btn app-focus-ring"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-app-border px-3 py-2">
          {visibleFilterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`ui-filter-chip app-focus-ring ${
                filter === tab.id ? "ui-filter-chip-active" : ""
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-[min(62vh,480px)] overflow-y-auto p-3">
          {loading ? (
            <p className="px-2 py-8 text-center text-[13px] text-app-muted">Laden...</p>
          ) : isEmpty ? (
            <EmptyState
              title="Geen notificaties"
              description="Geen items in dit filter."
              compact
            />
          ) : (
            <div className="space-y-4">
              {showInbox ? (
                <section>
                  <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-app-subtle">
                    Acties
                  </p>
                  <ul className="space-y-1">
                    {filteredInbox.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className="dashboard-focus-row app-focus-ring"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="text-[13px] font-medium text-app-text">
                              {item.label}
                            </span>
                            <span className="mt-0.5 block text-[12px] text-app-muted">
                              {item.subtitle}
                            </span>
                          </span>
                          <span className="text-[12px] font-semibold text-app-accent">
                            {item.actionLabel}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {showActivity ? (
                <section>
                  <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-app-subtle">
                    Recente activiteit
                  </p>
                  <ul className="space-y-1">
                    {filteredActivity.map((item) => (
                      <li key={item.id}>
                        {item.href ? (
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className="ui-activity-row rounded-lg px-2 app-focus-ring hover:bg-app-surface-hover"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-surface-muted text-[12px]">
                              {iconMap[item.icon]}
                            </span>
                            <span className="min-w-0 flex-1 text-[13px] text-app-text">
                              {item.label}
                            </span>
                            <span className="text-[11px] text-app-subtle">
                              {item.timeLabel}
                            </span>
                          </Link>
                        ) : (
                          <div className="ui-activity-row px-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-surface-muted text-[12px]">
                              {iconMap[item.icon]}
                            </span>
                            <span className="min-w-0 flex-1 text-[13px] text-app-text">
                              {item.label}
                            </span>
                            <span className="text-[11px] text-app-subtle">
                              {item.timeLabel}
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
