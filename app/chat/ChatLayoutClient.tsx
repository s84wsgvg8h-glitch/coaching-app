"use client";

import ChatApp from "@/components/chat/ChatApp";
import { useAuth } from "@/components/AuthProvider";
import { usePrefetchAppData } from "@/hooks/usePrefetchAppData";
import { usePrefetchAppRoutes } from "@/hooks/usePrefetchAppRoutes";

export default function ChatLayoutClient() {
  const { userId, role, profile, loading: authLoading } = useAuth();
  usePrefetchAppRoutes(role);
  usePrefetchAppData(
    userId,
    role,
    profile?.full_name || "",
    !authLoading && Boolean(userId && role),
  );

  return <ChatApp />;
}
