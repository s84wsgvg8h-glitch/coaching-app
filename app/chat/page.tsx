"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";

type Profile = {
  id: string;
  full_name: string;
  role: string;
  lastMessage?: string;
  lastMessageSender?: string;
  unreadCount?: number;
};

export default function ChatPage() {
  const [users, setUsers] = useState<Profile[]>([]);

  useEffect(() => {
    async function loadChats() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      if (profile.role === "coach") {
        const { data: athletes } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "atleet")
          .order("full_name", { ascending: true });

        const chats = await Promise.all(
          (athletes || []).map(async (athlete) => {
            const { data: lastMessages } = await supabase
              .from("messages")
              .select("*")
              .or(
                `and(sender_id.eq.${user.id},receiver_id.eq.${athlete.id}),and(sender_id.eq.${athlete.id},receiver_id.eq.${user.id})`
              )
              .order("created_at", { ascending: false })
              .limit(1);

            const { count: unreadCount } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("sender_id", athlete.id)
              .eq("receiver_id", user.id)
              .is("read_at", null);

            const lastMessage = lastMessages?.[0];

            let lastMessageText = "Nog geen berichten";
            let lastMessageSender = "";

            if (lastMessage) {
              lastMessageSender =
                lastMessage.sender_id === user.id ? "You" : athlete.full_name;

              if (lastMessage.body) {
                lastMessageText = lastMessage.body;
              } else if (lastMessage.file_type === "image") {
                lastMessageText = "📷 Foto";
              } else if (lastMessage.file_type === "video") {
                lastMessageText = "🎥 Video";
              } else if (lastMessage.file_type === "audio") {
                lastMessageText = "🎤 Voice message";
              }
            }

            return {
              ...athlete,
              lastMessage: lastMessageText,
              lastMessageSender,
              unreadCount: unreadCount || 0,
            };
          })
        );

        setUsers(chats);
      }

      if (profile.role === "atleet") {
        const { data: coaches } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "coach")
          .limit(1);

        const chats = await Promise.all(
          (coaches || []).map(async (coach) => {
            const { data: lastMessages } = await supabase
              .from("messages")
              .select("*")
              .or(
                `and(sender_id.eq.${user.id},receiver_id.eq.${coach.id}),and(sender_id.eq.${coach.id},receiver_id.eq.${user.id})`
              )
              .order("created_at", { ascending: false })
              .limit(1);

            const { count: unreadCount } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("sender_id", coach.id)
              .eq("receiver_id", user.id)
              .is("read_at", null);

            const lastMessage = lastMessages?.[0];

            let lastMessageText = "Nog geen berichten";
            let lastMessageSender = "";

            if (lastMessage) {
              lastMessageSender =
                lastMessage.sender_id === user.id ? "You" : coach.full_name;

              if (lastMessage.body) {
                lastMessageText = lastMessage.body;
              } else if (lastMessage.file_type === "image") {
                lastMessageText = "📷 Foto";
              } else if (lastMessage.file_type === "video") {
                lastMessageText = "🎥 Video";
              } else if (lastMessage.file_type === "audio") {
                lastMessageText = "🎤 Voice message";
              }
            }

            return {
              ...coach,
              lastMessage: lastMessageText,
              lastMessageSender,
              unreadCount: unreadCount || 0,
            };
          })
        );

        setUsers(chats);
      }
    }

    loadChats();
  }, []);

  async function openChat(otherUserId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    await supabase
      .from("messages")
      .update({
        read_at: new Date().toISOString(),
      })
      .eq("sender_id", otherUserId)
      .eq("receiver_id", user.id)
      .is("read_at", null);

    window.location.href = `/chat/${otherUserId}`;
  }

  return (
    <AppShell contentClassName="flex-1 p-0">
      <div className="max-w-3xl mx-auto bg-white min-h-screen">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Chats</h1>
            <p className="text-gray-500 mt-1">
              Kies een gesprek om verder te chatten
            </p>
          </div>

          <a
            href="/dashboard"
            className="bg-gray-100 px-4 py-2 rounded-xl text-sm hover:bg-gray-200"
          >
            Dashboard
          </a>
        </div>

        <div>
          {users.length === 0 && (
            <div className="p-6 text-gray-500">Je hebt nog geen chats.</div>
          )}

          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => openChat(user.id)}
              className="flex items-center gap-4 p-4 border-b hover:bg-gray-50 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold">
                {user.full_name?.charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                <h2
                  className={`truncate ${
                    user.unreadCount && user.unreadCount > 0
                      ? "font-bold"
                      : "font-semibold"
                  }`}
                >
                  {user.full_name}
                </h2>

                <p
                  className={`text-sm truncate ${
                    user.unreadCount && user.unreadCount > 0
                      ? "text-black font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  {user.lastMessageSender
                    ? `${user.lastMessageSender}: ${user.lastMessage}`
                    : "Nog geen berichten"}
                </p>
              </div>

              {user.unreadCount && user.unreadCount > 0 && (
                <div className="bg-black text-white text-xs font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                  {user.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
