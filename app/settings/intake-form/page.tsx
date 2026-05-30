import { redirect } from "next/navigation";

export default function IntakeFormSettingsRedirect() {
  redirect("/profile?section=settings");
}
