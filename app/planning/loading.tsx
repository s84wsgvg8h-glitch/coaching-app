import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteGenericPageSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function PlanningLoading() {
  return (
    <AppShellRouteLoading>
      <AthleteGenericPageSkeleton rows={6} />
    </AppShellRouteLoading>
  );
}
