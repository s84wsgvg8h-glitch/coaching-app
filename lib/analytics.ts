export type AnalyticsEvent =
  | "page_view"
  | "login_success"
  | "signup_complete"
  | "intake_started"
  | "intake_completed"
  | "dashboard_view"
  | "training_log_started"
  | "training_log_completed"
  | "bodyweight_logged"
  | "chat_opened"
  | "command_palette_opened"
  | "todo_completed"
  | "search_used";

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

type PostHogClient = {
  __loaded?: boolean;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  reset: () => void;
};

let identifiedUserId: string | null = null;
let posthogPromise: Promise<PostHogClient | null> | null = null;

async function getPostHog(): Promise<PostHogClient | null> {
  if (typeof window === "undefined") return null;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;

  if (!posthogPromise) {
    posthogPromise = import("posthog-js").then((module) => {
      const posthog = module.default as PostHogClient & {
        init: (key: string, options: Record<string, unknown>) => void;
      };
      if (!posthog.__loaded) {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
          api_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
          person_profiles: "identified_only",
          capture_pageview: false,
          capture_pageleave: true,
        });
      }
      return posthog;
    });
  }

  return posthogPromise;
}

function canCapture(client: PostHogClient | null) {
  return Boolean(client?.__loaded);
}

export async function initAnalytics() {
  return getPostHog();
}

export function trackEvent(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
): void {
  if (typeof window === "undefined") return;

  const payload = {
    ...properties,
    app: "limitless-coaching",
    path: window.location.pathname,
  };

  void getPostHog().then((posthog) => {
    if (canCapture(posthog)) {
      posthog!.capture(event, payload);
    }
  });

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event, payload);
  }
}

export function identifyUser(
  userId: string,
  traits?: AnalyticsProperties,
): void {
  if (typeof window === "undefined" || identifiedUserId === userId) return;
  identifiedUserId = userId;

  void getPostHog().then((posthog) => {
    if (canCapture(posthog)) {
      posthog!.identify(userId, traits);
    }
  });
}

export function resetAnalyticsUser(): void {
  identifiedUserId = null;
  void getPostHog().then((posthog) => {
    if (canCapture(posthog)) {
      posthog!.reset();
    }
  });
}

export function trackPageView(path: string): void {
  trackEvent("page_view", { path });
}
