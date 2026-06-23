import { applyTheme } from "@/lib/theme";
import { STORAGE_KEY as DASHBOARD_LAYOUT_KEY } from "@/lib/dashboardWidgetOrder";

export const UI_MIGRATION_VERSION = 6;
const MIGRATION_KEY = "coaching-app-ui-migration";

/** One-time client migration: reset cached dashboard layout and enforce dark theme. */
export function runUiMigrationIfNeeded() {
  if (typeof window === "undefined") return false;

  const current = Number(window.localStorage.getItem(MIGRATION_KEY) || 0);
  if (current >= UI_MIGRATION_VERSION) return false;

  window.localStorage.removeItem(DASHBOARD_LAYOUT_KEY);
  window.localStorage.removeItem("coach-dashboard-widget-order");
  applyTheme("dark");
  window.localStorage.setItem(MIGRATION_KEY, String(UI_MIGRATION_VERSION));
  return true;
}
