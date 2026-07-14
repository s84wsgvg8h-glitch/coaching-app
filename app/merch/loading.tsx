import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteGenericPageSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function MerchLoading() {
  return (
    <AppShellRouteLoading>
      <AthleteGenericPageSkeleton rows={4} />
    </AppShellRouteLoading>
  );
}
