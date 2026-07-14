import type { AuthenticatedProfile } from "@/lib/profileAuth";

export function needsIntakeCompletionFromProfile(
  profile: Pick<
    AuthenticatedProfile,
    "role" | "intake_completed_at" | "intake_required"
  > | null | undefined,
): boolean {
  if (!profile || profile.role !== "atleet") return false;
  if (profile.intake_required === false) return false;
  return !profile.intake_completed_at;
}
