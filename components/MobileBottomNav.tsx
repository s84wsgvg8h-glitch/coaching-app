"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Home, MessageCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useAthleteTrainingHref } from "@/hooks/useAthleteProgramEntry";
import { prefetchChatOverview } from "@/hooks/useChatOverview";
import { isActiveNavPath } from "@/lib/navigation";
import { prefetchProgramWeekFromHref } from "@/lib/prefetchProgramWeekFromHref";

const athleteMobileLinks = [
  { key: "home", href: "/dashboard", icon: Home, title: "Home" },
  { key: "training", href: "/programs", icon: Dumbbell, title: "Training" },
  { key: "chat", href: "/chat", icon: MessageCircle, title: "Chat" },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId, role } = useAuth();
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

  function prefetchChat() {
    if (!userId || !role) return;
    void prefetchChatOverview(queryClient, userId, role);
    void import("@/components/chat/ChatApp");
    router.prefetch("/chat");
  }

  return (
    <nav className="athlete-mobile-tab-bar fixed inset-x-0 bottom-0 z-40 lg:hidden" aria-label="Mobiele navigatie">
      <div className="grid grid-cols-3">
        {athleteMobileLinks.map((item) => {
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
                    : undefined
              }
              aria-current={active ? "page" : undefined}
              className={`app-focus-ring athlete-mobile-tab-bar__item ${
                active ? "is-active" : ""
              }`}
            >
              <span className="athlete-mobile-tab-bar__icon-wrap">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              <span className="athlete-mobile-tab-bar__label">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
