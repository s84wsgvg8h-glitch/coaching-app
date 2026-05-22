"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string | null;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
  read_at?: string | null;

  reply_to_body?: string | null;
  reply_to_file_type?: string | null;
  reply_to_sender_id?: string | null;
};

type Profile = {
  id: string;
  full_name: string;
  role: string;
  lastMessage?: string;
  lastMessageSender?: string;
  unreadCount?: number;
};

export default function ChatConversationPage() {
  const params = useParams();
  const receiverId = params.id as string;

  const [userId, setUserId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadChat() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
      }

      await supabase
        .from("messages")
        .update({
          read_at: new Date().toISOString(),
        })
        .eq("sender_id", receiverId)
        .eq("receiver_id", user.id)
        .is("read_at", null);

      if (profile?.role === "coach") {
        const { data: connections } = await supabase
          .from("connections")
          .select("athlete_id")
          .eq("coach_id", user.id);

        const athleteIds = connections?.map((c) => c.athlete_id) || [];

        if (athleteIds.length > 0) {
          const { data: athletes } = await supabase
            .from("profiles")
            .select("*")
            .in("id", athleteIds);

          const athletesWithLastMessages = await Promise.all(
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
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .eq("sender_id", athlete.id)
                .eq("receiver_id", user.id)
                .is("read_at", null);

              const lastMessage = lastMessages?.[0];

              let lastMessageText = "Nog geen berichten";
              let lastMessageSender = "";

              if (lastMessage) {
                lastMessageSender =
                  lastMessage.sender_id === user.id
                    ? "You"
                    : athlete.full_name;

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
                unreadCount:
                  athlete.id === receiverId ? 0 : unreadCount || 0,
              };
            })
          );

          setUsers(athletesWithLastMessages);
        }
      }

      const { data: receiver } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", receiverId)
        .single();

      if (receiver) {
        setReceiverName(receiver.full_name);
      }

      const { data: oldMessages } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      setMessages(oldMessages || []);
    }

    loadChat();
  }, [receiverId]);

  function getReplyText(msg: Message) {
    if (msg.body) return msg.body;
    if (msg.file_type === "image") return "📷 Foto";
    if (msg.file_type === "video") return "🎥 Video";
    if (msg.file_type === "audio") return "🎤 Voice message";
    return "Bericht";
  }

  function handleReply(msg: Message) {
    setReplyingTo(msg);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  async function openChat(otherUserId: string) {
    await supabase
      .from("messages")
      .update({
        read_at: new Date().toISOString(),
      })
      .eq("sender_id", otherUserId)
      .eq("receiver_id", userId)
      .is("read_at", null);

    setUsers((prev) =>
      prev.map((user) =>
        user.id === otherUserId
          ? {
              ...user,
              unreadCount: 0,
            }
          : user
      )
    );

    window.location.href = `/chat/${otherUserId}`;
  }

  async function sendMessage() {
    if (!message.trim()) return;

    const messageText = message;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      sender_id: userId,
      receiver_id: receiverId,
      body: messageText,
      file_url: null,
      file_type: null,
      created_at: new Date().toISOString(),
      read_at: null,

      reply_to_body: replyingTo ? getReplyText(replyingTo) : null,
      reply_to_file_type: replyingTo?.file_type || null,
      reply_to_sender_id: replyingTo?.sender_id || null,
    };

    const { error } = await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: receiverId,
      body: messageText,
      read_at: null,

      reply_to_body: replyingTo ? getReplyText(replyingTo) : null,
      reply_to_file_type: replyingTo?.file_type || null,
      reply_to_sender_id: replyingTo?.sender_id || null,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setMessages((prev) => [...prev, newMessage]);

    setUsers((prev) =>
      prev.map((user) =>
        user.id === receiverId
          ? {
              ...user,
              lastMessage: messageText,
              lastMessageSender: "You",
              unreadCount: 0,
            }
          : user
      )
    );

    setMessage("");
    setReplyingTo(null);
  }

  return (
    <main className="h-screen bg-gray-100 flex">
      <AppSidebar />
      <div className="flex flex-1 min-w-0">
      {userRole === "coach" && sidebarOpen && (
        <aside className="w-80 bg-white border-r flex flex-col">
          <div className="p-6 border-b">
            <div className="flex items-center justify-end">
              <button
                onClick={() => setSidebarOpen(false)}
                className="bg-gray-100 px-3 py-1 rounded-lg text-sm"
              >
                Inklappen
              </button>
            </div>

            <h1 className="text-2xl font-bold mt-4">Chats</h1>
          </div>

          <div className="flex-1 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => openChat(user.id)}
                className={`flex items-center gap-3 p-4 border-b hover:bg-gray-50 cursor-pointer ${
                  user.id === receiverId ? "bg-gray-100" : ""
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center font-bold">
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
        </aside>
      )}

      {userRole === "coach" && !sidebarOpen && (
        <div className="w-12 border-r bg-white flex flex-col items-center pt-4 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-xl"
            title="Chats openen"
          >
            ☰
          </button>
        </div>
      )}

      <section className="flex-1 bg-white flex flex-col">
        <div className="border-b px-6 py-4">
          <h1 className="font-bold text-xl">{receiverName}</h1>

          <p className="text-sm text-gray-500">Chat</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              onDoubleClick={() => handleReply(msg)}
              className={`flex cursor-pointer ${
                msg.sender_id === userId ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-md px-4 py-3 rounded-2xl ${
                  msg.sender_id === userId
                    ? "bg-black text-white"
                    : "bg-gray-100 text-black"
                }`}
              >
                {msg.reply_to_body && (
                  <div
                    className={`mb-2 rounded-xl px-3 py-2 border-l-4 ${
                      msg.sender_id === userId
                        ? "bg-white/10 border-white/70"
                        : "bg-white border-black"
                    }`}
                  >
                    <p className="text-xs font-semibold opacity-80">
                      {msg.reply_to_sender_id === userId ? "Jij" : receiverName}
                    </p>

                    <p className="text-sm opacity-80 truncate">
                      {msg.reply_to_body}
                    </p>
                  </div>
                )}

                {msg.body && (
                  <p className="whitespace-pre-line">{msg.body}</p>
                )}

                <div className="flex items-center justify-end gap-1 mt-1">
                  <p className="text-[11px] opacity-70">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  {msg.sender_id === userId && (
                    <span className="text-[11px] opacity-70">
                      {msg.read_at ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {replyingTo && (
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
            <div className="border-l-4 border-black pl-3">
              <p className="text-sm font-semibold">
                Antwoorden op{" "}
                {replyingTo.sender_id === userId ? "jezelf" : receiverName}
              </p>

              <p className="text-sm text-gray-600 truncate max-w-xl">
                {getReplyText(replyingTo)}
              </p>
            </div>

            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-500 text-xl"
            >
              ✕
            </button>
          </div>
        )}

        <div className="border-t p-4 flex gap-3">
          <input
            ref={inputRef}
            className="flex-1 border rounded-xl px-4 py-3 outline-none"
            placeholder="Typ een bericht..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />

          <button
            onClick={sendMessage}
            className="bg-black text-white px-6 rounded-xl"
          >
            Verstuur
          </button>
        </div>
      </section>
      </div>
    </main>
  );
}