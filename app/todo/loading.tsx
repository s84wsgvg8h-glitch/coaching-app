import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteGenericPageSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function TodoLoading() {
  return (
    <AppShellRouteLoading hideMobileTopBar>
      <AthleteGenericPageSkeleton rows={6} />
    </AppShellRouteLoading>
  );
}
