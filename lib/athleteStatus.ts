export type AthleteStatus = "active" | "attention" | "inactive";

export type AthleteStatusMeta = {
  status: AthleteStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
};

export function getAthleteStatus(
  daysSinceActivity: number | null,
  fillScore?: number | null,
): AthleteStatus {
  if (daysSinceActivity === null || daysSinceActivity >= 7) {
    return "inactive";
  }

  if (
    daysSinceActivity > 3 ||
    (fillScore !== null &&
      fillScore !== undefined &&
      fillScore < 50)
  ) {
    return "attention";
  }

  return "active";
}

export function getAthleteStatusMeta(status: AthleteStatus): AthleteStatusMeta {
  switch (status) {
    case "active":
      return {
        status,
        label: "Actief",
        badgeClass: "ui-badge-success",
        dotClass: "bg-emerald-500",
      };
    case "attention":
      return {
        status,
        label: "Aandacht",
        badgeClass: "ui-badge-warning",
        dotClass: "bg-amber-400",
      };
    default:
      return {
        status,
        label: "Inactief",
        badgeClass:
          "border border-app-border/80 bg-app-surface-muted/80 text-app-subtle",
        dotClass: "bg-app-muted",
      };
  }
}
