export const queryKeys = {
  athleteProgramEntry: (athleteId: string, actingUserId: string) =>
    ["athlete-program-entry", athleteId, actingUserId] as const,
  athleteFillScore: (athleteId: string) =>
    ["athlete-fill-score", athleteId] as const,
  athleteCoachChatPreview: (athleteId: string) =>
    ["athlete-coach-chat-preview", athleteId] as const,
  notificationCount: (userId: string, role: string) =>
    ["notification-count", userId, role] as const,
  chatOverview: (userId: string, role: string) =>
    ["chat-overview", userId, role] as const,
  programWeekCore: (blockId: string, weekId: string) =>
    ["program-week-core", blockId, weekId] as const,
  athleteDashboardItems: (athleteId: string) =>
    ["athlete-dashboard-items", athleteId] as const,
  coachCalendarEvents: (coachId: string) =>
    ["coach-calendar-events", coachId] as const,
  coachTodos: (coachId: string) => ["coach-todos", coachId] as const,
  teamEngagement: (coachId: string, role: string) =>
    ["team-engagement", coachId, role] as const,
  teamFillScores: (coachId: string, isAdmin: boolean) =>
    ["team-fill-scores", coachId, isAdmin] as const,
} as const;
