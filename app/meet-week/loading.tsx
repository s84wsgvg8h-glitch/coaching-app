import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteGenericPageSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function MeetWeekLoading() {
  return (
    <AppShellRouteLoading hideMobileTopBar>
      <AthleteGenericPageSkeleton rows={5} />
    </AppShellRouteLoading>
  );
}
