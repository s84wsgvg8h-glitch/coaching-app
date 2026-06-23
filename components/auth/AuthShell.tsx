"use client";

import type { ReactNode } from "react";
import ThemeToggle from "@/components/ThemeToggle";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="auth-shell relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-8 pt-safe pb-safe">
      <div className="auth-shell-glow pointer-events-none" aria-hidden="true" />
      <div className="absolute right-4 top-4 z-10 pt-safe sm:right-6 sm:top-6">
        <ThemeToggle compact />
      </div>
      <div className="ui-auth-card animate-fade-in w-full max-w-[420px]">
        <p className="text-[12px] font-medium tracking-wide text-app-accent">
          Limitless Coaching
        </p>
        <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-app-text">
          {title}
        </h1>
        <p className="mt-2 text-[14px] font-normal leading-relaxed text-app-muted">
          {subtitle}
        </p>
        <div className="mt-8 space-y-3">{children}</div>
        {footer ? <div className="mt-8">{footer}</div> : null}
      </div>
    </main>
  );
}

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-app-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`ui-auth-input w-full px-3.5 py-3 text-[15px] text-app-text outline-none app-focus-ring ${props.className || ""}`}
    />
  );
}
