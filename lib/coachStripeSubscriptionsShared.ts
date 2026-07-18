export type CoachSubscriptionStatusFilter =
  | "all"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type CoachAthleteSubscriptionRow = {
  id: string;
  athleteUserId: string | null;
  athleteName: string;
  athleteEmail: string;
  packageName: string;
  monthlyAmountLabel: string;
  status: string;
  statusLabel: string;
  trialEnd: string | null;
  nextPaymentDate: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string;
};

export function coachAthleteSubscriptionStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Actief";
    case "trialing":
      return "Proefperiode";
    case "past_due":
      return "Betaling achterstallig";
    case "unpaid":
      return "Onbetaald";
    case "incomplete":
      return "Onvolledig";
    case "incomplete_expired":
      return "Onvolledig (verlopen)";
    case "canceled":
      return "Geannuleerd";
    case "paused":
      return "Gepauzeerd";
    default:
      return status;
  }
}

export function filterCoachSubscriptions(
  subscriptions: CoachAthleteSubscriptionRow[],
  statusFilter: CoachSubscriptionStatusFilter,
  search: string,
): CoachAthleteSubscriptionRow[] {
  const query = search.trim().toLowerCase();

  return subscriptions.filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) {
      return false;
    }

    if (!query) return true;

    return (
      row.athleteName.toLowerCase().includes(query) ||
      row.athleteEmail.toLowerCase().includes(query)
    );
  });
}
