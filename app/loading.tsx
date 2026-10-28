import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteGenericPageSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function Loading() {
  return (
    <AppShellRouteLoading>
      <AthleteGenericPageSkeleton />
    </AppShellRouteLoading>
  );
}
