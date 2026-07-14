import { AthleteChatListSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function ChatLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <AthleteChatListSkeleton />
    </div>
  );
}
