import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteGenericPageSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function AthletesLoading() {
  return (
    <AppShellRouteLoading hideMobileTopBar>
      <AthleteGenericPageSkeleton rows={8} />
    </AppShellRouteLoading>
  );
}
