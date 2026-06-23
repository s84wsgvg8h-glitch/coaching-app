"use client";

import { useState } from "react";
import CoachWeekCalendar from "@/components/CoachWeekCalendar";
import CoachActivityFeed from "@/components/dashboard/CoachActivityFeed";
import CoachInboxPanel from "@/components/dashboard/CoachInboxPanel";
import CoachUpcomingAppointmentsPanel from "@/components/dashboard/CoachUpcomingAppointmentsPanel";
import DashboardKpiRow from "@/components/dashboard/DashboardKpiRow";
import type {
  CoachDashboardMetrics,
  CoachInboxItem,
  DashboardActivityItem,
} from "@/lib/coachDashboardFeed";

export type CoachDashboardMainSections = {
  kpi?: boolean;
  inbox?: boolean;
  upcomingAppointments?: boolean;
  calendar?: boolean;
  activity?: boolean;
};

type CoachDashboardMainProps = {
  userId: string;
  metrics: CoachDashboardMetrics;
  inbox: CoachInboxItem[];
  activity: DashboardActivityItem[];
  sections?: CoachDashboardMainSections;
  calendarDefaultExpanded?: boolean;
};

const DEFAULT_SECTIONS: CoachDashboardMainSections = {
  kpi: true,
  inbox: true,
  calendar: true,
  activity: true,
};

export default function CoachDashboardMain({
  userId,
  metrics,
  inbox,
  activity,
  sections = DEFAULT_SECTIONS,
  calendarDefaultExpanded = false,
}: CoachDashboardMainProps) {
  const [calendarFocus, setCalendarFocus] = useState<{
    date: string;
    startAt?: string;
    appointmentId?: string;
  } | null>(null);

  const showInbox = sections.inbox !== false && !sections.upcomingAppointments;
  const showUpcoming = sections.upcomingAppointments === true;
  const showCalendar = sections.calendar !== false;
  const showSidePanel = showInbox || showUpcoming;
  const showGrid = showSidePanel || showCalendar;

  return (
    <div className="space-y-3 md:space-y-4">
      {sections.kpi !== false ? <DashboardKpiRow metrics={metrics} /> : null}

      {showGrid ? (
        <div className="dashboard-agenda-hub glass-accent-card">
          <div
            className={`grid gap-3 md:gap-4 ${
              showSidePanel && showCalendar
                ? "lg:grid-cols-[minmax(150px,170px)_minmax(0,1fr)]"
                : "grid-cols-1"
            }`}
          >
          {showUpcoming ? (
            <CoachUpcomingAppointmentsPanel
              coachId={userId}
              onSelectAppointment={(appointment) =>
                setCalendarFocus({
                  date: appointment.start_at.slice(0, 10),
                  startAt: appointment.all_day
                    ? undefined
                    : appointment.start_at,
                  appointmentId: appointment.id,
                })
              }
            />
          ) : showInbox ? (
            <CoachInboxPanel items={inbox} />
          ) : null}
          {showCalendar ? (
            <CoachWeekCalendar
              userId={userId}
              variant="embedded"
              defaultExpanded={calendarDefaultExpanded}
              focusRequest={calendarFocus}
              onFocusHandled={() => setCalendarFocus(null)}
            />
          ) : null}
          </div>
        </div>
      ) : null}

      {sections.activity !== false ? (
        <CoachActivityFeed items={activity} />
      ) : null}
    </div>
  );
}
