import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteGenericPageSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function LeaderboardLoading() {
  return (
    <AppShellRouteLoading>
      <AthleteGenericPageSkeleton rows={8} />
    </AppShellRouteLoading>
  );
}
