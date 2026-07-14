import { detectAndInsertPeriodizationAlerts } from "@/lib/periodizationAlerts";

const SESSION_PREFIX = "periodization-alerts-ran:";

function sessionKey(coachId: string) {
  return `${SESSION_PREFIX}${coachId}`;
}

/** Runs periodization detection once per browser session, off the critical path. */
export function schedulePeriodizationAlertDetection(
  coachId: string,
  role: string,
) {
  if (typeof window === "undefined" || !coachId) return;

  try {
    if (sessionStorage.getItem(sessionKey(coachId)) === "1") return;
  } catch {
    // sessionStorage unavailable
  }

  const run = () => {
    void detectAndInsertPeriodizationAlerts(coachId, role)
      .then(() => {
        try {
          sessionStorage.setItem(sessionKey(coachId), "1");
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // allow retry next navigation if detection failed
      });
  };

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(() => run(), { timeout: 8000 });
    return;
  }

  globalThis.setTimeout(run, 3000);
}
