import { redirect } from "next/navigation";

export default function CompetitionChecklistSettingsRedirect() {
  redirect("/profile?section=settings");
}
