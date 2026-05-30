"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveNavPath } from "@/lib/navigation";

const athleteMobileLinks = [
  { href: "/dashboard", icon: "🏠", title: "Home" },
  { href: "/programs", icon: "🏋️", title: "Training" },
  { href: "/chat", icon: "💬", title: "Chat" },
  { href: "/data", icon: "📈", title: "Data" },
  { href: "/wedstrijd-checklist", icon: "✅", title: "Checklist" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-app-border bg-app-sidebar pb-safe lg:hidden"
      aria-label="Mobiele navigatie"
    >
      <div className="grid grid-cols-5">
        {athleteMobileLinks.map((item) => {
          const active = isActiveNavPath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`app-focus-ring flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-semibold transition ${
                active
                  ? "text-app-accent"
                  : "text-app-muted hover:text-app-text"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
