import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteGenericPageSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function InvulscoreLoading() {
  return (
    <AppShellRouteLoading>
      <AthleteGenericPageSkeleton rows={6} />
    </AppShellRouteLoading>
  );
}
