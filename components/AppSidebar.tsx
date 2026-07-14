"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getNavGroups, isActiveNavPath } from "@/lib/navigation";
import {
  CHAT_UNREAD_CHANGED_EVENT,
  getUnreadMessageCount,
} from "@/lib/chatUnread";
import { getChatReturnRoute } from "@/lib/chatNavigation";
import { useAuth } from "@/components/AuthProvider";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

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
    deferEffectUpdate(() => {
      setChatHref(getChatReturnRoute());
    });
  }, [pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileNav(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    deferEffectUpdate(() => {
      setMenuOpen(false);
    });
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

  const groupedNav = getNavGroups(role, pendingCount, chatUnreadCount);
  const dashboardLink = groupedNav
    .flatMap((group) => group.links)
    .find((link) => link.href === "/dashboard");
  const navLinks = groupedNav
    .flatMap((group) => group.links)
    .filter((link) => link.href !== "/dashboard");
  const profileActive = isActiveNavPath(pathname, "/profile");
  const hideMobileMenu =
    pathname.startsWith("/chat") || pathname.includes("/weeks/");

  function resolveNavHref(href: string) {
    if (href !== "/chat") return href;
    return isMobileNav ? "/chat" : chatHref;
  }

  return (
    <>
      <aside
        className={`group ui-sidebar-panel sticky top-0 z-30 hidden h-[100dvh] max-w-[56px] min-w-[56px] w-14 flex-col self-start overflow-hidden border-r border-app-border px-2 py-3 transition-all duration-300 ease-out hover:w-60 hover:max-w-[240px] lg:flex ${className}`}
      >
        <Link
          href="/dashboard"
          className="mb-3 flex items-center justify-center gap-2 px-1 group-hover:justify-start"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-app-accent/30 bg-app-accent/10 text-[11px] font-bold tracking-tight text-app-accent shadow-[0_0_20px_rgba(79,140,255,0.15)]">
            LC
          </span>
          <span className="truncate text-[13px] font-semibold tracking-tight text-app-text opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Limitless
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {dashboardLink ? (
            <div className="mb-1">
              <Link
                href="/dashboard"
                title={dashboardLink.title}
                className={`ui-sidebar-item relative flex items-center gap-3 px-2.5 py-2 transition-all duration-200 app-focus-ring ${
                  isActiveNavPath(pathname, "/dashboard")
                    ? "ui-sidebar-item-active"
                    : ""
                }`}
              >
                <div
                  className={`ui-sidebar-icon ${
                    isActiveNavPath(pathname, "/dashboard")
                      ? "ui-sidebar-icon-active"
                      : ""
                  }`}
                >
                  {dashboardLink.icon}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden opacity-0 transition-all duration-200 group-hover:opacity-100">
                  <h3 className="truncate text-sm font-medium tracking-tight">
                    {dashboardLink.title}
                  </h3>
                  <p className="truncate text-xs text-app-muted">
                    {dashboardLink.description}
                  </p>
                </div>
              </Link>
            </div>
          ) : null}

        <div className="mb-5 flex items-center justify-center transition-all group-hover:justify-between">
          <Link
            href="/profile"
            className={`ui-sidebar-item flex w-full items-center gap-3 px-2 py-2 transition app-focus-ring ${
              profileActive ? "ui-sidebar-item-active" : ""
            }`}
          >
            <div
              className={`ui-sidebar-icon ${
                profileActive ? "ui-sidebar-icon-active" : ""
              }`}
            >
              👤
            </div>

            <div className="overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:opacity-100">
              <p className="text-sm font-medium tracking-tight">
                {fullName || "Profiel"}
              </p>
              <p className="text-xs capitalize text-app-muted">
                {role || "..."}
              </p>
            </div>
          </Link>
        </div>

          <div className="space-y-0.5">
          {navLinks.map((item) => {
                  const active = isActiveNavPath(pathname, item.href);
                  const href = resolveNavHref(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={href}
                      title={item.title}
                      className={`ui-sidebar-item relative flex items-center gap-3 px-2.5 py-2 transition-all duration-200 app-focus-ring ${
                        active ? "ui-sidebar-item-active" : ""
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div
                          className={`ui-sidebar-icon ${
                            active ? "ui-sidebar-icon-active" : ""
                          }`}
                        >
                          {item.icon}
                        </div>

                        {item.badge !== undefined && item.badge > 0 && (
                          <div className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-app-destructive px-1 text-[9px] font-semibold text-white">
                            {item.badge}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 overflow-hidden opacity-0 transition-all duration-200 group-hover:opacity-100">
                        <h3 className="truncate text-sm font-medium tracking-tight">
                          {item.title}
                        </h3>
                        <p className="truncate text-xs text-app-muted">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            title="Uitloggen"
            className="ui-sidebar-item relative mt-1 flex w-full items-center gap-3 px-2.5 py-2 text-left app-focus-ring"
          >
            <div className="ui-sidebar-icon">🚪</div>
            <div className="min-w-0 flex-1 overflow-hidden opacity-0 transition-all duration-200 group-hover:opacity-100">
              <h3 className="truncate text-sm font-medium tracking-tight text-app-text">
                Uitloggen
              </h3>
            </div>
          </button>
        </nav>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Menu sluiten"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          <div className="absolute inset-x-0 bottom-0 flex max-h-[min(88dvh,100dvh)] flex-col overflow-hidden rounded-t-[20px] border-t border-app-border bg-app-surface pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-[slidepanel_0.22s_ease-out]">
            <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-app-border-strong" />
            <div className="flex shrink-0 items-center justify-between border-b border-app-border px-5 py-4">
              <div>
                <p className="ui-label">Menu</p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-app-text">
                  {fullName || "Ingelogd"}
                </p>
                <p className="text-sm capitalize text-app-muted">{role || "..."}</p>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-app-border bg-app-surface-hover text-lg text-app-muted"
                aria-label="Sluit menu"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 mobile-scroll">
              {dashboardLink ? (
                <div className="apple-group mb-3">
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className={`apple-group-row ${
                      isActiveNavPath(pathname, "/dashboard")
                        ? "bg-app-surface-hover"
                        : ""
                    }`}
                  >
                    <span
                      className={`ui-sidebar-icon ${
                        isActiveNavPath(pathname, "/dashboard")
                          ? "ui-sidebar-icon-active"
                          : ""
                      }`}
                    >
                      {dashboardLink.icon}
                    </span>
                    <div>
                      <p className="font-medium tracking-tight">
                        {dashboardLink.title}
                      </p>
                      <p className="text-xs text-app-muted">
                        {dashboardLink.description}
                      </p>
                    </div>
                  </Link>
                </div>
              ) : null}

              <div className="apple-group mb-3">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className={`apple-group-row ${
                    profileActive ? "bg-app-surface-hover" : ""
                  }`}
                >
                  <span className="ui-sidebar-icon">👤</span>
                  <div>
                    <p className="font-medium tracking-tight">Profiel</p>
                    <p className="text-xs text-app-muted">
                      Bekijk en pas je profiel aan
                    </p>
                  </div>
                </Link>
              </div>

              <nav className="apple-group">
                {navLinks
                  .filter((item) => item.href !== "/profile")
                  .map((item) => {
                    const active = isActiveNavPath(pathname, item.href);
                    const href = resolveNavHref(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className={`apple-group-row ${
                          active ? "bg-app-surface-hover" : ""
                        }`}
                      >
                        <span
                          className={`relative ui-sidebar-icon ${
                            active ? "ui-sidebar-icon-active" : ""
                          }`}
                        >
                          {item.icon}
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-app-destructive px-1 text-[9px] font-semibold text-white">
                              {item.badge}
                            </span>
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium tracking-tight">{item.title}</p>
                          <p className="truncate text-xs text-app-muted">
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
                onClick={() => void logout()}
                className="apple-group-row w-full text-left"
              >
                <span className="ui-sidebar-icon">🚪</span>
                <div>
                  <p className="font-medium tracking-tight">Uitloggen</p>
                </div>
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
          className="pointer-events-auto ui-btn-secondary !h-12 !w-12 !rounded-full !p-0"
          aria-label="Menu openen"
        >
          <span className="flex flex-col gap-1.5" aria-hidden="true">
            <span className="block h-0.5 w-4 rounded-full bg-app-text" />
            <span className="block h-0.5 w-4 rounded-full bg-app-text" />
            <span className="block h-0.5 w-4 rounded-full bg-app-text" />
          </span>
        </button>
      </nav>
    </>
  );
}
