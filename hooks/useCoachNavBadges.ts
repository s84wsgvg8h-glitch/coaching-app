"use client";

import { useEffect, useState } from "react";
import { CHAT_UNREAD_CHANGED_EVENT } from "@/lib/chatUnread";
import {
  loadCoachNavBadges,
  type CoachNavBadges,
} from "@/lib/coachNavBadges";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

const EMPTY_BADGES: CoachNavBadges = {
  chat: 0,
  todo: 0,
  videoReview: 0,
  pendingAthletes: 0,
};

export function useCoachNavBadges(userId: string | null, role: string) {
  const [badges, setBadges] = useState<CoachNavBadges>(EMPTY_BADGES);

  useEffect(() => {
    if (!userId) {
      deferEffectUpdate(() => {
        setBadges(EMPTY_BADGES);
      });
      return;
    }

    let cancelled = false;

    async function refresh() {
      if (!userId) return;
      const next = await loadCoachNavBadges(userId, role);
      if (!cancelled) setBadges(next);
    }

    void refresh();
    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);

    return () => {
      cancelled = true;
      window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [role, userId]);

  return badges;
}
