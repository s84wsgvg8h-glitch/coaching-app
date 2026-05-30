"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getNavLinks, isActiveNavPath } from "@/lib/navigation";
import {
  CHAT_UNREAD_CHANGED_EVENT,
  getUnreadMessageCount,
} from "@/lib/chatUnread";
import { getChatReturnRoute } from "@/lib/chatNavigation";
import { useAuth } from "@/components/AuthProvider";

type AppSidebarProps = {
  className?: string;
};

export default function AppSidebar({ className = "" }: AppSidebarProps) {
  const pathname = usePathname();
  const { profile, role, userId } = useAuth();
  const fullName = profile?.full_name || "";
  const [pendingCount, setPendingCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatHref, setChatHref] = useState("/chat");
  const [isMobileNav, setIsMobileNav] = useState(false);

  useEffect(() => {
    if (!userId) return;

    async function loadSidebarCounts() {
      const { data: pendingProfiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "pending");

      setPendingCount(pendingProfiles?.length || 0);
      setChatUnreadCount(await getUnreadMessageCount(userId));
    }

    loadSidebarCounts();

    function handleChatUnreadChanged() {
      loadSidebarCounts();
    }

    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, handleChatUnreadChanged);

    return () => {
      window.removeEventListener(
        CHAT_UNREAD_CHANGED_EVENT,
        handleChatUnreadChanged,
      );
    };
  }, [pathname, userId]);

  useEffect(() => {
    setChatHref(getChatReturnRoute());
  }, [pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileNav(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const links = getNavLinks(role, pendingCount, chatUnreadCount);
  const profileActive = isActiveNavPath(pathname, "/profile");
  const hideMobileMenu = pathname.startsWith("/chat/");

  function resolveNavHref(href: string) {
    if (href !== "/chat") return href;
    return isMobileNav ? "/chat" : chatHref;
  }

  return (
    <>
      <aside
        className={`group sticky top-0 z-30 hidden h-[100dvh] max-w-[80px] min-w-[80px] w-20 flex-col self-start overflow-hidden bg-app-sidebar p-3 shadow-xl transition-all duration-150 hover:w-64 hover:max-w-[256px] lg:flex ${className}`}
      >
        <div className="mb-5 flex items-center justify-center transition-all group-hover:justify-between">
          <Link
            href="/profile"
            className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 transition app-focus-ring ${
              profileActive
                ? "bg-app-primary text-app-primary-fg"
                : "bg-app-surface-muted hover:bg-app-surface-hover"
            }`}
          >
            <div
              className={`flex h-9 min-w-9 items-center justify-center rounded-lg text-lg shadow ${
                profileActive ? "bg-white text-black" : "bg-white"
              }`}
            >
              👤
            </div>

            <div className="overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:opacity-100">
              <p className="text-sm font-semibold">{fullName || "Profiel"}</p>
              <p
                className={`text-xs capitalize ${
                  profileActive ? "text-gray-300" : "text-gray-400"
                }`}
              >
                Ingelogd als {role || "..."}
              </p>
              <p
                className={`mt-1 text-xs ${
                  profileActive ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Profiel aanpassen
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {links.map((item) => {
            const active = isActiveNavPath(pathname, item.href);
            const href = resolveNavHref(item.href);

            return (
              <Link
                key={item.href}
                href={href}
                className={`relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200 app-focus-ring ${
                  active
                    ? "bg-app-primary text-app-primary-fg"
                    : "bg-app-surface-muted hover:bg-app-surface-hover"
                }`}
              >
                <div className="relative">
                  <div
                    className={`flex h-9 min-w-9 items-center justify-center rounded-lg text-lg shadow ${
                      active ? "bg-white text-black" : "bg-white"
                    }`}
                  >
                    {item.icon}
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white shadow">
                      {item.badge}
                    </div>
                  )}
                </div>

                <div className="overflow-hidden whitespace-nowrap opacity-0 transition-all duration-100 group-hover:opacity-100">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p
                    className={`text-xs ${
                      active ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <button
            type="button"
            onClick={logout}
            className="theme-preserve app-focus-ring flex w-full items-center gap-3 rounded-xl bg-app-primary px-3 py-2 text-app-primary-fg transition hover:opacity-90"
          >
          <span className="min-w-9 text-lg">🚪</span>
          <span className="overflow-hidden whitespace-nowrap text-sm opacity-0 transition-all duration-100 group-hover:opacity-100">
            Uitloggen
          </span>
        </button>
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Menu sluiten"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
          />

          <div className="absolute inset-x-0 bottom-0 flex max-h-[min(88dvh,100dvh)] flex-col overflow-hidden rounded-t-3xl bg-app-surface pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl animate-[slidepanel_0.22s_ease-out]">
            <div className="flex shrink-0 items-center justify-between border-b border-app-border px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-app-muted">
                  Menu
                </p>
                <p className="text-lg font-bold text-app-text">
                  {fullName || "Ingelogd"}
                </p>
                <p className="text-sm capitalize text-app-muted">{role || "..."}</p>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-app-surface-muted text-xl text-app-text"
                aria-label="Sluit menu"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 mobile-scroll">
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className={`mb-3 flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                  profileActive
                    ? "bg-black text-white"
                    : "bg-gray-100 text-black hover:bg-gray-200"
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow">
                  👤
                </span>
                <div>
                  <p className="font-semibold">Profiel</p>
                  <p
                    className={`text-xs ${
                      profileActive ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    Bekijk en pas je profiel aan
                  </p>
                </div>
              </Link>

              <nav className="flex flex-col gap-2">
                {links
                  .filter((item) => item.href !== "/profile")
                  .map((item) => {
                    const active = isActiveNavPath(pathname, item.href);
                    const href = resolveNavHref(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                          active
                            ? "bg-black text-white"
                            : "bg-gray-100 text-black hover:bg-gray-200"
                        }`}
                      >
                        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow">
                          {item.icon}
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
                              {item.badge}
                            </span>
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold">{item.title}</p>
                          <p
                            className={`truncate text-xs ${
                              active ? "text-gray-300" : "text-gray-500"
                            }`}
                          >
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
              </nav>
            </div>

            <div className="shrink-0 border-t border-app-border px-4 pt-3">
              <button
                type="button"
                onClick={logout}
                className="theme-preserve flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-3 text-sm font-bold text-app-primary-fg"
              >
                <span>🚪</span>
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        className={`pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-50 lg:hidden ${
          hideMobileMenu ? "hidden" : ""
        } ${className}`}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-app-border bg-app-surface/95 shadow-lg backdrop-blur active:scale-95"
          aria-label="Menu openen"
        >
          <span className="flex flex-col gap-1.5" aria-hidden="true">
            <span className="block h-0.5 w-5 rounded-full bg-app-text" />
            <span className="block h-0.5 w-5 rounded-full bg-app-text" />
            <span className="block h-0.5 w-5 rounded-full bg-app-text" />
          </span>
        </button>
      </nav>
    </>
  );
}
