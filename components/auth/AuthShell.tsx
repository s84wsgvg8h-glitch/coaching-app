"use client";

import type { ReactNode } from "react";

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
    <main className="auth-shell relative flex h-full min-h-0 w-full flex-col items-center justify-center overflow-y-auto overscroll-contain px-4 py-6 pb-safe sm:min-h-[100dvh] sm:py-8">
      <div className="auth-shell-glow pointer-events-none" aria-hidden="true" />
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
