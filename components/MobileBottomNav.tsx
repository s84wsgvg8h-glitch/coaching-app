"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Home, MessageCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/components/LocaleProvider";
import { useAthleteTrainingHref } from "@/hooks/useAthleteProgramEntry";
import { prefetchChatOverview } from "@/hooks/useChatOverview";
import { isActiveNavPath } from "@/lib/navigation";
import { prefetchProgramWeekFromHref } from "@/lib/prefetchProgramWeekFromHref";

const athleteMobileLinkKeys = [
  { key: "home", href: "/dashboard", icon: Home, labelKey: "nav.home" },
  { key: "training", href: "/programs", icon: Dumbbell, labelKey: "nav.training" },
  { key: "chat", href: "/chat", icon: MessageCircle, labelKey: "nav.chat" },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId, role } = useAuth();
  const { t } = useLocale();
  const { href: trainingHref } = useAthleteTrainingHref(
    userId,
    role === "atleet" && Boolean(userId),
  );

  useEffect(() => {
    if (!trainingHref || trainingHref === "/programs") return;
    router.prefetch(trainingHref);
  }, [router, trainingHref]);

  function prefetchTraining() {
    if (!userId || !role) return;
    if (trainingHref && trainingHref !== "/programs") {
      void prefetchProgramWeekFromHref(queryClient, trainingHref, {
        userId,
        role,
      });
      router.prefetch(trainingHref);
    }
  }

  function prefetchHome() {
    router.prefetch("/dashboard");
  }

  function prefetchProfile() {
    if (!userId || !role) return;
    router.prefetch("/profile");
  }

  function prefetchData() {
    router.prefetch("/data");
  }

  function prefetchChat() {
    if (!userId || !role) return;
    void prefetchChatOverview(queryClient, userId, role);
    void import("@/components/chat/ChatApp");
    router.prefetch("/chat");
  }

  return (
    <nav className="athlete-mobile-tab-bar fixed inset-x-0 bottom-0 z-40 lg:hidden" aria-label={t("nav.mobileAthlete")}>
      <div className="grid grid-cols-3">
        {athleteMobileLinkKeys.map((item) => {
          const href =
            item.key === "training" && trainingHref ? trainingHref : item.href;
          const active = isActiveNavPath(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={href}
              prefetch
              onTouchStart={
                item.key === "training"
                  ? prefetchTraining
                  : item.key === "chat"
                    ? prefetchChat
                    : item.key === "home"
                      ? prefetchHome
                      : undefined
              }
              onMouseEnter={
                item.key === "home"
                  ? prefetchProfile
                  : item.key === "training"
                    ? prefetchData
                    : undefined
              }
              aria-current={active ? "page" : undefined}
              className={`athlete-mobile-tab-bar__item ${
                active ? "is-active" : ""
              }`}
            >
              <span className="athlete-mobile-tab-bar__icon-wrap">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              <span className="athlete-mobile-tab-bar__label">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
