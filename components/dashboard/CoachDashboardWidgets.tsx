"use client";

import {
  FIXED_COACH_DASHBOARD_LAYOUT,
  widgetGridClass,
  type CoachWidgetId,
} from "@/lib/dashboardWidgetOrder";

type CoachDashboardWidgetsProps = {
  widgets: Partial<Record<CoachWidgetId, React.ReactNode>>;
};

export default function CoachDashboardWidgets({
  widgets,
}: CoachDashboardWidgetsProps) {
  return (
    <div className="grid grid-cols-12 gap-3 md:gap-4">
      {FIXED_COACH_DASHBOARD_LAYOUT.map(({ id, width }) => {
        const content = widgets[id];
        if (!content) return null;

        return (
          <div
            key={id}
            data-coach-widget={id}
            className={widgetGridClass(id, width)}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
