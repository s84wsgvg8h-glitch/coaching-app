export function getDashboardGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

export function dashboardFirstName(fullName: string) {
  return fullName.split(/\s+/)[0] || fullName || "Coach";
}

export function formatDashboardDate(date = new Date()) {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}
