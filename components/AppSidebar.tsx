"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getNavLinks, isActiveNavPath } from "@/lib/navigation";

type AppSidebarProps = {
  className?: string;
};

export default function AppSidebar({ className = "" }: AppSidebarProps) {
  const pathname = usePathname();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function loadSidebarData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setRole(data.role || "");
      }

      const { data: pendingProfiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "pending");

      setPendingCount(pendingProfiles?.length || 0);
    }

    loadSidebarData();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const links = getNavLinks(role, pendingCount);
  const profileActive = isActiveNavPath(pathname, "/profile");

  return (
    <aside
      className={`group sticky top-0 h-screen self-start w-20 min-w-[80px] max-w-[80px] hover:w-64 hover:max-w-[256px] bg-white shadow-xl p-3 flex flex-col transition-all duration-300 overflow-hidden z-30 ${className}`}
    >
      <div className="flex items-center justify-center group-hover:justify-between mb-5 transition-all">
        <Link
          href="/profile"
          className={`flex items-center gap-3 transition rounded-xl px-2 py-2 w-full ${
            profileActive
              ? "bg-black text-white"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          <div
            className={`min-w-9 h-9 rounded-lg shadow flex items-center justify-center text-lg ${
              profileActive ? "bg-white text-black" : "bg-white"
            }`}
          >
            👤
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden">
            <p className="font-semibold text-sm">{fullName || "Profiel"}</p>
            <p
              className={`text-xs capitalize ${
                profileActive ? "text-gray-300" : "text-gray-400"
              }`}
            >
              Ingelogd als {role || "..."}
            </p>
            <p
              className={`text-xs mt-1 ${
                profileActive ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Profiel aanpassen
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {links.map((item) => {
          const active = isActiveNavPath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                active
                  ? "bg-black text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              <div className="relative">
                <div
                  className={`min-w-9 h-9 rounded-lg shadow flex items-center justify-center text-lg ${
                    active ? "bg-white text-black" : "bg-white"
                  }`}
                >
                  {item.icon}
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow">
                    {item.badge}
                  </div>
                )}
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden">
                <h3 className="font-semibold text-sm">{item.title}</h3>
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

      <button
        type="button"
        onClick={logout}
        className="bg-black text-white px-3 py-2 rounded-xl mt-5 flex items-center gap-3 hover:opacity-90 transition"
      >
        <span className="min-w-9 text-lg">🚪</span>
        <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden text-sm">
          Uitloggen
        </span>
      </button>
    </aside>
  );
}
