"use client";

import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: PageHeaderProps) {
  return (
    <header className="page-shell-header mb-3 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-wide text-app-subtle md:text-[12px]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-0.5 text-[20px] font-semibold tracking-tight text-app-text md:text-[24px] md:leading-[1.1]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-[12px] font-normal leading-relaxed text-app-muted md:text-[13px]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-app-text">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[13px] font-normal text-app-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  href?: string;
  trend?: string;
  trendTone?: "neutral" | "up" | "down" | "accent";
  className?: string;
  onClick?: () => void;
};

export function StatCard({
  label,
  value,
  href,
  trend,
  trendTone = "neutral",
  className = "",
  onClick,
}: StatCardProps) {
  const trendClass =
    trendTone === "up"
      ? "text-emerald-400"
      : trendTone === "down"
        ? "text-red-400"
        : trendTone === "accent"
          ? "text-app-accent"
          : "text-app-subtle";

  const body = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wide text-app-subtle">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-semibold leading-none tracking-tight text-app-text">
        {value}
      </p>
      {trend ? (
        <p className={`mt-1.5 text-[11px] font-medium leading-snug ${trendClass}`}>
          {trend}
        </p>
      ) : null}
    </>
  );

  const classes = `ui-kpi group block text-left transition-all duration-200 hover:border-app-border-strong hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] ${className}`;

  if (href) {
    return (
      <a href={href} className={`${classes} app-focus-ring block`}>
        {body}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${classes} app-focus-ring`}>
        {body}
      </button>
    );
  }

  return <div className={classes}>{body}</div>;
}

type BadgeProps = {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "accent";
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  const variantClass =
    variant === "success"
      ? "ui-badge-success"
      : variant === "warning"
        ? "ui-badge-warning"
        : variant === "danger"
          ? "ui-badge-danger"
          : variant === "accent"
            ? "ui-badge-accent"
            : "ui-badge";

  return <span className={variantClass}>{children}</span>;
}

type PanelProps = {
  children: ReactNode;
  className?: string;
  compact?: boolean;
};

export function Panel({ children, className = "", compact = false }: PanelProps) {
  return (
    <div className={`${compact ? "ui-panel-compact" : "ui-panel"} ${className}`}>
      {children}
    </div>
  );
}

export function PageContainer({
  children,
  className = "",
  size = "lg",
}: {
  children: ReactNode;
  className?: string;
  size?: "md" | "lg" | "xl" | "full";
}) {
  const max =
    size === "md"
      ? "max-w-5xl"
      : size === "lg"
        ? "max-w-[1800px]"
        : "max-w-none";
  return (
    <div className={`mx-auto w-full min-w-0 overflow-x-hidden ${max} ${className}`}>
      {children}
    </div>
  );
}
