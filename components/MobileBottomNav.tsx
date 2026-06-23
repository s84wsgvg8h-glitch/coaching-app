"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Home, MessageCircle } from "lucide-react";
import { isActiveNavPath } from "@/lib/navigation";

const athleteMobileLinks = [
  { href: "/dashboard", icon: Home, title: "Home" },
  { href: "/programs", icon: Dumbbell, title: "Training" },
  { href: "/chat", icon: MessageCircle, title: "Chat" },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="athlete-mobile-tab-bar fixed inset-x-0 bottom-0 z-40 pb-safe lg:hidden"
      aria-label="Mobiele navigatie"
    >
      <div className="grid grid-cols-3">
        {athleteMobileLinks.map((item) => {
          const active = isActiveNavPath(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`app-focus-ring athlete-mobile-tab-bar__item ${
                active ? "is-active" : ""
              }`}
            >
              <span className="athlete-mobile-tab-bar__icon-wrap">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              <span className="athlete-mobile-tab-bar__label">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
