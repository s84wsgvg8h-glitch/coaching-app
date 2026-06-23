"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

const ChatApp = dynamic(() => import("@/components/chat/ChatApp"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[100dvh] min-w-0 overflow-hidden bg-app-bg">
      <aside className="hidden w-[320px] shrink-0 border-r border-app-border/60 bg-app-surface/40 p-4 md:block">
        <Skeleton className="mb-4 h-10 w-full rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center px-4">
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="h-3 w-48 max-w-full" />
        <p className="mt-4 text-[13px] text-app-muted">Chat laden…</p>
      </main>
    </div>
  ),
});

export default function ChatLayout() {
  return <ChatApp />;
}
