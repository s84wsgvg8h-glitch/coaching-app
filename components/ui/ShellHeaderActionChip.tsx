"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

function chipClassName(className?: string, iconOnly?: boolean) {
  return [
    "shell-topbar-action-chip",
    "app-focus-ring",
    iconOnly ? "shell-topbar-action-chip--icon" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

type ShellHeaderActionChipProps = {
  children: ReactNode;
  className?: string;
  badge?: number;
  badgeLabel?: string;
};

export function ShellHeaderActionButton({
  children,
  className,
  badge,
  badgeLabel,
  ...props
}: ShellHeaderActionChipProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={chipClassName(className, true)}
      {...props}
    >
      {children}
      {badge != null && badge > 0 ? (
        <span className="shell-topbar-action-badge" aria-hidden="true">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
      {badge != null && badge > 0 && badgeLabel ? (
        <span className="sr-only">{badgeLabel}</span>
      ) : null}
    </button>
  );
}

type ShellHeaderActionLinkProps = ShellHeaderActionChipProps & {
  href: string;
};

export function ShellHeaderActionLink({
  href,
  children,
  className,
  badge,
  badgeLabel,
  ...props
}: ShellHeaderActionLinkProps &
  Omit<React.ComponentProps<typeof Link>, "href" | "children" | "className">) {
  return (
    <Link href={href} className={chipClassName(className)} {...props}>
      {children}
      {badge != null && badge > 0 ? (
        <span className="shell-topbar-action-badge" aria-hidden="true">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
      {badge != null && badge > 0 && badgeLabel ? (
        <span className="sr-only">{badgeLabel}</span>
      ) : null}
    </Link>
  );
}

export function ShellHeaderActionAvatar({
  children,
  icon = false,
}: {
  children: ReactNode;
  icon?: boolean;
}) {
  return (
    <span
      className={`shell-topbar-action-avatar${
        icon ? " shell-topbar-action-avatar--icon" : ""
      }`}
    >
      {children}
    </span>
  );
}
